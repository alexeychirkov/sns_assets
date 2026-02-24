mod declarations;
mod headers;
mod serve;

use declarations::*;
use headers::build_asset_headers;
pub use serve::*;

use flate2::bufread::GzEncoder;
use globset::{Glob, GlobMatcher};
use ic_asset_certification::{
    Asset, AssetConfig, AssetEncoding, AssetFallbackConfig, AssetRedirectKind,
};
use ic_cdk::api::certified_data_set;
use ic_http_certification::StatusCode;
use include_dir::Dir;
use std::io::{Read, Write as _};

lazy_static::lazy_static! {
    static ref HTML_MATCHER: GlobMatcher = Glob::new("**/*.html").unwrap().compile_matcher();
    static ref JS_MATCHER: GlobMatcher = Glob::new("**/*.js").unwrap().compile_matcher();
    static ref CSS_MATCHER: GlobMatcher = Glob::new("**/*.css").unwrap().compile_matcher();
}

fn is_common_encoding(file_path: &str) -> bool {
    HTML_MATCHER.is_match(file_path)
        || JS_MATCHER.is_match(file_path)
        || CSS_MATCHER.is_match(file_path)
}

/// Recursively collect all assets from the provided directory
fn collect_assets<'content, 'path>(
    dir: &'content Dir<'path>,
    assets: &mut Vec<Asset<'content, 'path>>,
) {
    for file in dir.files() {
        let path = file.path().to_string_lossy();
        if is_common_encoding(path.as_ref()) {
            // Add Brotli and Gzip for common encodings.
            let mut brotli = brotli::CompressorWriter::new(Vec::new(), 4096, 11, 22);
            brotli.write_all(file.contents()).unwrap();
            let mut content = brotli.into_inner();
            assets.push(Asset::new(format!("{}.br", path), content));
            let mut gzip = GzEncoder::new(file.contents(), flate2::Compression::default());
            content = Vec::new();
            gzip.read_to_end(&mut content).unwrap();
            assets.push(Asset::new(format!("{}.gz", path), content));
        }
        assets.push(Asset::new(path, file.contents()));
    }

    for dir in dir.dirs() {
        collect_assets(dir, assets);
    }
}

// Certification
macro_rules! create_asset_pattern {
    ($pattern:expr, $content_type:expr, $encodings:expr) => {
        AssetConfig::Pattern {
            pattern: $pattern.to_string(),
            content_type: Some($content_type.to_string()),
            headers: build_asset_headers(vec![(
                "cache-control".to_string(),
                IMMUTABLE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            encodings: $encodings,
        }
    };
}

pub fn certify_all_assets(assets_dir: &'static Dir<'_>, canister_id: Option<&str>) {
    // 1. Define the asset certification configurations.
    let encodings = vec![
        AssetEncoding::Brotli.default_config(),
        AssetEncoding::Gzip.default_config(),
    ];

    let asset_configs = vec![
        AssetConfig::File {
            path: "index.html".to_string(),
            content_type: Some("text/html".to_string()),
            headers: build_asset_headers(vec![(
                "cache-control".to_string(),
                NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
            )]),
            fallback_for: vec![AssetFallbackConfig {
                scope: "/".to_string(),
                status_code: Some(StatusCode::OK),
            }],
            aliased_by: vec!["/".to_string()],
            encodings: encodings.clone(),
        },
        create_asset_pattern!("**/*.html", "text/html", encodings.clone()),
        create_asset_pattern!("**/*.js", "application/javascript", encodings.clone()),
        create_asset_pattern!("**/*.css", "text/css", encodings),
        create_asset_pattern!("**/*.png", "image/png", vec![]),
        create_asset_pattern!("**/*.jpg", "image/jpeg", vec![]),
        create_asset_pattern!("**/*.jpeg", "image/jpeg", vec![]),
        create_asset_pattern!("**/*.ico", "image/x-icon", vec![]),
        create_asset_pattern!("**/*.svg", "image/svg+xml", vec![]),
        AssetConfig::Redirect {
            from: "/old-url".to_string(),
            to: "/".to_string(),
            kind: AssetRedirectKind::Permanent,
            headers: build_asset_headers(vec![
                ("content-type".to_string(), "text/plain".to_string()),
                (
                    "cache-control".to_string(),
                    NO_CACHE_ASSET_CACHE_CONTROL.to_string(),
                ),
            ]),
        },
    ];

    let mut assets = Vec::new();
    // 2. Add the canister ID as a special static asset if provided.
    if let Some(canister_id) = canister_id {
        assets.push(Asset::new(
            "get_canister_id",
            canister_id.as_bytes().to_vec(),
        ));
    }
    // 3. Collect all assets from the frontend build directory.
    collect_assets(assets_dir, &mut assets);

    ASSET_ROUTER.with_borrow_mut(|asset_router| {
        // 4. Certify the assets using the `certify_assets` function from the `ic-asset-certification` crate.
        if let Err(err) = asset_router.certify_assets(assets, asset_configs) {
            ic_cdk::trap(&format!("Failed to certify assets: {}", err));
        }

        // 5. Set the canister's certified data.
        certified_data_set(asset_router.root_hash());
    });
}
