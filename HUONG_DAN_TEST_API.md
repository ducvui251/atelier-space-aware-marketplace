# Hướng dẫn test API Atelier (Swagger)

## 1. Chạy server

```bash
pnpm install
pnpm dev
```

Mở [http://localhost:3000/api-docs](http://localhost:3000/api-docs) — đây là trang Swagger UI, đọc trực tiếp từ `public/openapi.json`.

> **Lưu ý quan trọng**: API này (`/api/**`) dùng một bộ dữ liệu mock riêng, sống trong bộ nhớ của
> Node server (mất khi `pnpm dev` restart). Nó **tách biệt hoàn toàn** với dữ liệu bạn thấy khi
> dùng giao diện web (web dùng `localStorage` của trình duyệt). Cả hai được khởi tạo (seed) từ
> cùng một bộ dữ liệu mẫu, nên tài khoản/id tác phẩm giống nhau, nhưng thao tác ở bên này không
> ảnh hưởng bên kia. Xem tài khoản test trong [TAI_KHOAN_TEST.txt](TAI_KHOAN_TEST.txt).

## 2. Cách test 1 API bằng Swagger UI

1. Bấm vào tên endpoint để mở rộng (ví dụ `POST /api/auth/login`).
2. Bấm **Try it out**.
3. Sửa nội dung request body (JSON) nếu cần — mỗi endpoint đã có sẵn ví dụ (example) điền sẵn.
4. Bấm **Execute**.
5. Xem kết quả ở phần **Server response** — gồm status code, response body, và cả câu lệnh
   `curl` tương đương (copy ra terminal chạy lại cũng được).
6. Với các API có icon ổ khoá 🔒 (yêu cầu đăng nhập): trước tiên gọi
   `POST /api/auth/login` để lấy `token`, sau đó bấm nút **Authorize** ở đầu trang, dán token
   vào ô, bấm **Authorize** → **Close**. Từ giờ mọi request "Try it out" sẽ tự động gắn header
   `Authorization: Bearer <token>`.
7. Muốn đổi sang tài khoản khác (ví dụ từ buyer sang admin): login lại bằng tài khoản mới, lấy
   token mới, mở lại **Authorize**, xoá token cũ và dán token mới vào.

## 3. Kịch bản test theo từng service (đối chiếu với 8 module trong tài liệu)

### 3.1. Account — đăng nhập & hồ sơ
1. `POST /api/auth/login` với `buyer1@atelier.test` / `buyer123` → kỳ vọng `200`, có `token`.
2. Thử sai mật khẩu → kỳ vọng `401 { "error": "Invalid email or password" }`.
3. Authorize bằng token buyer, gọi `GET /api/account/me` → kỳ vọng thấy đúng `fullName`,
   `email`, `role: "buyer"`.
4. `PATCH /api/account/me` với `{"fullName": "", ...}` → kỳ vọng `400` (fullName rỗng không hợp lệ).
5. `PATCH /api/account/me` với `{"fullName": "Tên Mới", "phone": "0999999999"}` → `200`, gọi lại
   `GET /api/account/me` để xác nhận đã lưu.

### 3.2. Catalog & Discovery — tìm kiếm/khám phá
1. `GET /api/artworks` (không tham số) → trả toàn bộ danh sách.
2. `GET /api/artworks?style=Abstract` → chỉ còn tác phẩm có style Abstract.
3. `GET /api/artworks?minPrice=1000&maxPrice=2000` → kiểm tra mọi item trong khoảng giá.
4. `GET /api/artworks?q=silent` → tìm theo từ khoá, phải ra "Silent Hall".
5. `GET /api/artworks/aw-04-silent-hall` → `200`, `availability: "reserved"`.
6. `GET /api/artworks/khong-ton-tai` → `404`.
7. `GET /api/artists` và `GET /api/artists/artist-maria-wood` → kiểm tra `verificationStatus: "pending"`.
8. `GET /api/rooms` → trả 5 phòng mẫu.

### 3.3. Artist & Artwork — nghệ sĩ quản lý listing
1. Login `artist2@atelier.test` / `artist123` (Maria Wood — đang pending), Authorize.
2. `GET /api/artist/artworks` → chỉ thấy 2 tác phẩm của Maria (Concrete Light, Below the Freeway).
3. `POST /api/artist/artworks` thiếu `title` → `400` (đúng luồng ngoại lệ "thiếu metadata bắt buộc").
4. `POST /api/artist/artworks` đầy đủ field → `201`, tác phẩm mới có `verificationStatus: "pending"`,
   `availability: "available"`. Ghi lại `id` trả về.
5. Thử gọi `GET /api/artist/artworks` bằng token của **buyer** → kỳ vọng `403` (sai role).
6. `PATCH /api/artist/artworks/{id}` (id vừa tạo) đổi giá → `200`, kiểm tra
   `verificationStatus` bị đưa về lại `"pending"` (đúng luồng: sửa metadata → duyệt lại).

### 3.4. Commerce — giỏ hàng, checkout, đơn hàng, vận chuyển
1. Login buyer, `POST /api/cart {"artworkId":"aw-02-ember-field"}` → `201`.
2. `GET /api/cart` → thấy Ember Field, `total` = 960.
3. `DELETE /api/cart/aw-02-ember-field` → giỏ hàng rỗng lại.
4. Thêm lại vào giỏ, sau đó `POST /api/checkout` với `shippingAddress` đầy đủ, `method: "card"`
   → `201`, có `orders[]`. Gọi lại `GET /api/artworks/aw-02-ember-field` để xác nhận
   `availability` đã chuyển thành `"sold"`.
5. `POST /api/checkout` với giỏ hàng đang trống → `400`.
6. `POST /api/checkout` với `simulateFailure: true` → `402` (giả lập thanh toán thất bại).
7. Thử checkout một tác phẩm đã `sold`/`reserved` (ví dụ thêm `aw-04-silent-hall` vào giỏ rồi
   checkout) → `409` (đúng luồng ngoại lệ "vừa chuyển sang reserved/sold").
8. `GET /api/orders` → thấy đơn vừa tạo, trạng thái `"paid"`.
9. Login artist tương ứng với tác phẩm vừa mua, `POST /api/artist/orders/{orderId}/ship`
   `{"carrier":"GHN Express","trackingNumber":"GHN123"}` → `200`, order chuyển `"shipped"`.
10. Về lại buyer, `POST /api/orders/{orderId}/confirm-received` → `200`, order → `"completed"`.
11. `POST /api/orders/{orderId}/reviews {"rating":5}` → `201`. Gọi lại khi order chưa completed
    (dùng order khác đang `"paid"`) → kỳ vọng `409`.
12. `POST /api/orders/{orderId}/complaints {"reason":"..."}` → `201`.

### 3.5. Recommendation — lưu & gợi ý
1. Login buyer, `GET /api/saved` → danh sách hiện có (đã seed sẵn 1 tác phẩm).
2. `POST /api/saved/aw-05-infinite-courtyard` → toggle, response `{"saved": false}` (vì đã lưu
   sẵn trong seed nên lần đầu gọi sẽ là bỏ lưu) — gọi lại lần nữa để lưu lại (`{"saved": true}`).
3. `POST /api/follows/artist-lena-moreau` → toggle theo dõi nghệ sĩ.
4. `GET /api/recommendations` (có Authorize) → `reason: "personalized"` nếu đã có saved/follow,
   ngược lại gọi **không** Authorize (bỏ header) → `reason: "curated"`.

### 3.6. Verification — xác thực nghệ sĩ & tác phẩm
1. Login `admin1@atelier.test`, `GET /api/admin/verification-queue` → thấy Maria Wood,
   Sara Lindqvist và các tác phẩm pending.
2. `POST /api/admin/artists/artist-maria-wood/review {"status":"rejected"}` (thiếu `note`)
   → `400` (bắt buộc lý do khi từ chối).
3. `POST /api/admin/artists/artist-maria-wood/review {"status":"verified"}` → `200`.
4. `GET /api/artists/artist-maria-wood` → xác nhận `verificationStatus: "verified"`.
5. Tương tự với `POST /api/admin/artworks/{id}/review`.
6. Gọi endpoint trên bằng token **buyer** → `403`.

### 3.7. Admin — quản trị hệ thống
1. `GET /api/admin/stats` (admin) → xem `pendingArtists`, `pendingArtworks`, `openComplaints`,
   `revenue` — đối chiếu với số liệu vừa tạo ở các bước trên.
2. `GET /api/admin/complaints` → danh sách khiếu nại, khiếu nại `open` đứng trước.
3. `POST /api/admin/complaints/{id}/resolve {"status":"resolved","note":"..."}` → `200`.
4. `GET /api/admin/complaints` lại → complaint đã chuyển `"resolved"`.

### 3.8. Room Preview
1. `GET /api/rooms` → 5 phòng mẫu (`room-living`, `room-bedroom`, ...), mỗi phòng có `imageUrl`.

## 4. Reset dữ liệu API khi test xong

Dữ liệu API sống trong RAM của tiến trình `pnpm dev` — chỉ cần dừng và chạy lại `pnpm dev` là
toàn bộ trở về trạng thái seed ban đầu (không ảnh hưởng gì tới dữ liệu web/localStorage).
