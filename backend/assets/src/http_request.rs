use ic_cdk::query;
use ic_http_certification::{HttpRequest, HttpResponse};

#[query]
pub fn http_request(req: HttpRequest) -> HttpResponse<'static> {
    crate::asset_certification::serve_asset(&req)
}
