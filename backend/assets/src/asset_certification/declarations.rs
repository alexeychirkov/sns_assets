use ic_asset_certification::AssetRouter;
use ic_http_certification::HttpCertificationTree;
use std::{cell::RefCell, rc::Rc};

thread_local! {
    pub(super) static HTTP_TREE: Rc<RefCell<HttpCertificationTree>> = Default::default();

    // initializing the asset router with an HTTP certification tree is optional.
    // if direct access to the HTTP certification tree is not needed for certifying
    // requests and responses outside of the asset router, then this step can be skipped.
    pub(super) static ASSET_ROUTER: RefCell<AssetRouter<'static>> = RefCell::new(AssetRouter::with_tree(HTTP_TREE.with(|tree| tree.clone())));
}

pub(super) const IMMUTABLE_ASSET_CACHE_CONTROL: &str = "public, max-age=31536000, immutable";
pub(super) const NO_CACHE_ASSET_CACHE_CONTROL: &str = "public, no-cache, no-store";
