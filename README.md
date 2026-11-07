# AI Chat TOC & Navigator (Chrome Extension - Manifest V3)

Tiện ích mở rộng dành cho trình duyệt Chromium (Chrome, Edge, Brave, Cốc Cốc) giúp tạo **Mục lục (Table of Contents)** và thanh điều hướng nhanh cho các trang AI Chat: **ChatGPT** (`chatgpt.com`, `chat.openai.com`) và **Google Gemini** (`gemini.google.com`).

---

## 🌟 Điểm nổi bật & Cập nhật mới nhất

1. **Giao diện dạng Đè lên (Overlay Drawer) & Tự động thu nhỏ khi Click ra ngoài**:
   - Hoàn toàn **không can thiệp hay thay đổi layout của trang web gốc** (khung chat giữ nguyên 100% kích thước, không co rút lề).
   - **Click ra ngoài để đóng ngay lập tức**: Khi Sidebar đang mở, bạn chỉ cần nhấp chuột vào bất kỳ vùng nào trên màn hình trò chuyện bên ngoài Sidebar, tiện ích sẽ tự động thu nhỏ trượt về cạnh phải để trả lại toàn bộ không gian đọc văn bản thông thoáng.
   - Nút `X` và phím tắt `Esc` / `Alt + T` vẫn hỗ trợ đóng/mở nhanh.

2. **Kéo thả nút kích hoạt (Draggable Floating Button)**:
   - Nút tròn "Mục lục" ở góc dưới có thể kéo thả chuột lên/xuống dọc màn hình để tránh che khuất các nút riêng của ChatGPT/Gemini (như nút cuộn xuống dưới, nút voice). Vị trí được lưu tự động.

3. **ScrollSpy – Tự động bám theo câu hỏi đang đọc**:
   - Khi bạn cuộn trang đọc nội dung, mục tương ứng trên Sidebar sẽ tự động được tô sáng để bạn luôn biết mình đang ở câu hỏi số mấy.

4. **Công nghệ Shadow DOM (Isolated CSS)**:
   - Toàn bộ giao diện tiện ích được đóng gói 100% bên trong **Shadow Root**. CSS của ChatGPT/Gemini không thể làm vỡ giao diện tiện ích và ngược lại.

5. **Điều hướng thông minh (Smooth Scroll & Glow Pulse)**:
   - Click vào bất kỳ câu hỏi nào trong danh sách: Trang tự động lướt mượt (`smooth scroll`) đến đúng đoạn chat đó.
   - Kèm hiệu ứng phát sáng viền xanh (Glow Pulse animation) trong 1.8 giây để mắt người dùng định vị ngay lập tức.

6. **Sao chép toàn bộ mục lục (Export Markdown)**:
   - Nút Copy ở góc trên Sidebar giúp copy danh sách toàn bộ câu hỏi dưới dạng Markdown chỉ với 1 click.

7. **Bộ lọc tìm kiếm tức thì (Real-time Filter)**:
   - Ô search giúp lọc nhanh câu hỏi theo từ khóa trong các cuộc trò chuyện dài hàng trăm câu hỏi.

8. **Hiệu năng cao & Hỗ trợ SPA (Single Page App)**:
   - Sử dụng **Debounced MutationObserver**: Không lag/giật kể cả khi AI đang stream tin nhắn dài liên tục.
   - Tự động nhận diện khi người dùng chuyển sang cuộc trò chuyện khác (URL change) để cập nhật lại mục lục mà không cần F5 trang.
   - Tự động đồng bộ giao diện Sáng / Tối (Light / Dark mode) theo trang web.

---

## 📁 Cấu trúc thư mục Source Code

```text
├── manifest.json         # Cấu hình Chrome Extension (Manifest V3)
├── content.js            # Toàn bộ logic lõi (Click-outside, Shadow DOM UI, ScrollSpy, ChatGPT & Gemini Adapters)
├── icons/                # Icon các kích thước chuẩn
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── ai-chat-toc.user.js   # Phiên bản dự phòng dạng Userscript (Tampermonkey)
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
6. Nếu bạn đã tải trước đó, chỉ cần bấm nút **Tải lại (biểu tượng xoay vòng 🔄)** trên thẻ của tiện ích để cập nhật bản mới nhất.

---

## 💡 Cách sử dụng

1. Mở bất kỳ cuộc trò chuyện nào trên [ChatGPT](https://chatgpt.com) hoặc [Google Gemini](https://gemini.google.com).
2. Bấm vào nút **"Mục lục"** ở góc phải (hoặc nhấn **`Alt + T`**): Sidebar sẽ trượt ra đè lên màn hình.
3. **Nhấp vào một câu hỏi**: Trang web sẽ tự động cuộn đến tin nhắn tương ứng và chớp sáng nổi bật.
4. **Đọc nội dung không bị che khuất**: Chỉ cần **click bất kỳ đâu trên màn hình bên ngoài Sidebar** (hoặc bấm `Esc`, hoặc click nút `X`), Sidebar sẽ tự động thu nhỏ ngay lập tức!
5. **Kéo thả nút nổi**: Giữ chuột vào nút tròn "Mục lục" và kéo lên/xuống vị trí thuận tiện nhất trên màn hình của bạn.
