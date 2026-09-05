# Atelier API — OpenAPI spec

`openapi.json` mô tả toàn bộ REST API mock của Atelier (`/api/**`, chạy trong Next.js ở
`src/app/api/`), nhóm theo 8 service trong tài liệu (Account, Catalog & Discovery,
Artist & Artwork, Commerce, Recommendation, Verification, Room Preview, Admin).

File này **độc lập với web app** — không phải một trang trong Next.js — để bạn có thể mở
bằng bất kỳ công cụ Swagger nào bên ngoài.

## Cách xem & test bằng editor.swagger.io

1. Chạy server: `pnpm dev` (mặc định `http://localhost:3000`).
2. Mở [https://editor.swagger.io](https://editor.swagger.io).
3. Menu **File → Import File** → chọn `api-docs/openapi.json` (hoặc **File → Paste** rồi
   dán nội dung file).
4. Bên phải sẽ hiện giao diện docs giống hệt ảnh mẫu — các nhóm endpoint theo từng service.
5. Bấm vào 1 endpoint → **Try it out** → **Execute** để gọi thật vào
   `http://localhost:3000` (CORS đã được bật sẵn cho `/api/**` trong
   `src/middleware.ts` nên gọi từ editor.swagger.io sẽ không bị chặn).
6. Với endpoint có khoá 🔒: gọi `POST /api/auth/login` trước để lấy `token`, rồi bấm nút
   **Authorize** ở đầu trang, dán token vào.

Xem chi tiết kịch bản test từng service trong [`HUONG_DAN_TEST_API.md`](../HUONG_DAN_TEST_API.md)
ở thư mục gốc, và tài khoản demo trong [`TAI_KHOAN_TEST.txt`](../TAI_KHOAN_TEST.txt).
