use ic_cdk::api::data_certificate;
use ic_http_certification::{HttpRequest, HttpResponse};

// Handlers
pub fn serve_asset(req: &HttpRequest) -> HttpResponse<'static> {
    super::ASSET_ROUTER.with_borrow(|asset_router| {
        if let Ok(response) = asset_router.serve_asset(
            &data_certificate().expect("No data certificate available"),
            req,
        ) {
            response
        } else {
            ic_cdk::trap("Failed to serve asset");
        }
    })
}

#[macro_export]
macro_rules! with_simple_http_request {
    () => {
        use ic_http_certification::{HttpRequest, HttpResponse};

        #[query]
        pub fn http_request(req: HttpRequest) -> HttpResponse<'_> {
            $crate::serve_asset(&req)
        }
    };
}

#[macro_export]
macro_rules! with_upgradable_http_request {
    ($need_upgrade_predicate:ident) => {
        use ic_http_certification::{HttpRequest, HttpResponse, StatusCode};

        #[query]
        pub fn http_request(req: HttpRequest) -> HttpResponse<'_> {
            if $need_upgrade_predicate(&req) {
                return HttpResponse::builder()
                    .with_status_code(ic_http_certification::StatusCode::OK)
                    .with_body(b"need upgrade")
                    .with_upgrade(true)
                    .build();
            }
            $crate::serve_asset(&req)
        }
    };
}
