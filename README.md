# AI Chat TOC & Navigator (Chrome Extension - Manifest V3)

Tiện ích mở rộng dành cho trình duyệt Chromium (Chrome, Edge, Brave, Cốc Cốc) giúp tạo **Mục lục (Table of Contents)** và thanh điều hướng nhanh cho các trang AI Chat: **ChatGPT** (`chatgpt.com`, `chat.openai.com`) và **Google Gemini** (`gemini.google.com`).

---

## 🌟 Điểm nổi bật & Yêu cầu kỹ thuật

1. **Giao diện dạng Đè lên (Overlay Drawer)**:
   - Hoàn toàn **không can thiệp hay thay đổi layout của trang web gốc** (không bóp méo khung chat, không đổi margin/padding của web).
   - Sidebar nổi mượt mà ở góc phải màn hình, có nút thu gọn/mở rộng linh hoạt.

2. **Công nghệ Shadow DOM (Isolated CSS)**:
   - Toàn bộ giao diện tiện ích được đóng gói 100% bên trong **Shadow Root**. CSS của ChatGPT/Gemini không thể làm vỡ giao diện tiện ích và ngược lại.

3. **Điều hướng thông minh (Smooth Scroll & Glow Pulse)**:
   - Click vào bất kỳ câu hỏi nào trong danh sách, màn hình sẽ tự động lướt mượt (`smooth scroll`) đến đúng đoạn chat đó.
   - Kèm hiệu ứng phát sáng viền (Glow animation) trong 2 giây để người dùng nhận biết ngay vị trí đã nhảy tới.

4. **Bộ lọc tìm kiếm tức thì (Real-time Filter)**:
   - Có ô search để lọc nhanh câu hỏi trong các cuộc trò chuyện dài hàng chục câu hỏi.

5. **Hiệu năng cao & Hỗ trợ SPA (Single Page App)**:
   - Sử dụng **Debounced MutationObserver**: Không lag/giật kể cả khi AI đang stream tin nhắn dài liên tục.
   - Tự động nhận diện khi người dùng chuyển sang cuộc trò chuyện khác (URL change) để cập nhật lại mục lục mà không cần F5 trang.
   - Tự động đồng bộ giao diện Sáng / Tối (Light / Dark mode) theo trang web.

---

## 📁 Cấu trúc thư mục Source Code

```text
├── manifest.json         # Cấu hình Chrome Extension (Manifest V3)
├── content.js            # Toàn bộ logic lõi (Adapter, Shadow DOM UI, Scroll Engine)
├── icons/                # Icon các kích thước chuẩn
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── generate_icons.js     # Script Node.js tạo icon
└── README.md             # Hướng dẫn chi tiết
```

---

## 🚀 Hướng dẫn cài đặt vào Chrome / Edge / Brave

1. Mở trình duyệt Chrome hoặc Edge.
2. Truy cập vào đường dẫn: `chrome://extensions/` (hoặc `edge://extensions/`).
3. Bật công tắc **"Chế độ dành cho nhà phát triển" (Developer mode)** ở góc trên bên phải.
4. Bấm vào nút **"Tải tiện ích đã giải nén" (Load unpacked)** ở góc trên bên trái.
5. Chọn thư mục chứa source code này:
   ```
   c:\Users\Tuan Izi\OneDrive\Máy tính\Code\tool google\tool filter history chat in AI chat
   ```
6. Tiện ích **AI Chat TOC & Navigator** sẽ xuất hiện trong danh sách extension.

---

## 💡 Cách sử dụng

1. Mở bất kỳ cuộc trò chuyện nào trên [ChatGPT](https://chatgpt.com) hoặc [Google Gemini](https://gemini.google.com).
2. Bạn sẽ thấy một **nút tròn nổi "Mục lục" kèm số lượng câu hỏi** ở góc dưới bên phải màn hình.
3. Bấm vào nút đó (hoặc bấm tổ hợp phím tắt **`Alt + T`**) để mở Sidebar đè lên.
4. **Nhấp vào một câu hỏi**: Trang web sẽ tự động cuộn đến tin nhắn tương ứng và chớp sáng nổi bật.
5. **Gõ vào ô tìm kiếm**: Lọc nhanh các câu hỏi cần tìm trong phiên chat.
6. Nhấn **`Esc`** hoặc phím tắt **`Alt + T`** để thu gọn Sidebar khi cần không gian rộng rãi.

