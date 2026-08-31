# Ouk-Khmer Online — Development Log

## Current Status

Stage 29 complete (Production Hardening & Live E2E Verification PASSED 100%).
Stage 28 complete (Real Production Deployment to Vercel & Railway PASSED 100%).
Stage 27 complete (Production Deployment & Architecture Audit PASSED 100%).
Stage 26 complete (Real Auth + Online End-to-End Verification PASSED 100%).
Stage 25D complete (Firebase Provisioning & Production Configuration Activated PASSED 100%).
Stage 25C complete (Real Firebase Project Configuration & Google Login Audit Completed).
Stage 25B complete (Firebase Production Config + Google Login Integration PASSED 100%).
Stage 25 complete (Authentication & Account System - Firebase Auth + Firestore PASSED 100%).
Stage 24 complete (Online Observability + Operator Diagnostics PASSED 100%).
Stage 23 complete (Online UX Polish, Rematch Flow & Recovery Hardening PASSED 100%).
Stage 22A complete (Corrective Audit & Soak Verification PASSED 100%).
Stage 22 complete (Production Hardening & Concurrency/Desync QA PASSED 100%).
Stage 21B complete (Online Match Audio, Turn UI & Device Sleep/Resume Fix PASSED 100%).
Stage 21 complete (Online Match Experience + Ruleset/AFK Correction PASSED 100%).
All 42/42 auth security tests, 46/46 observability tests, 18/18 UX polish tests, 32/32 corrective audit tests, 30/30 hardening tests, 15/15 runtime socket tests, 80/80 multiplayer core tests, and 48/48 asset integrity checks PASSED.

---

## Stage 29 Final — Balanced 2-Column Header & Production Deployment

- **Ngày thực hiện**: 2026-08-31
- **Branch**: `online-multiplayer`
- **Nội dung thực hiện**:
  1. **Gộp toàn bộ Header thành layout 2 cột cân đối duy nhất**:
     - Container: Một `<header>` duy nhất chứa toàn bộ BRANDING + AUTH + ONLINE STATUS.
     - **Cột Trái (Branding & Status)**: Logo Mascot + Title (`Cờ Ốc Chatrang`) + Online status (`● 2.847 đang trực tuyến`).
     - **Cột Phải (Player Auth)**:
       - Hàng trên: Avatar + Tên kỳ thủ (hoặc Khách vãng lai) kèm nút đổi tên nếu đã login.
       - Hàng dưới: Nút Đăng nhập/Đăng xuất + Nút âm thanh (nếu có).
     - Xóa hoàn toàn subtitle cũ "Cờ Ốc Khmer cổ truyền" và pill online bị trùng lặp bên phải.
     - Không tạo Account Bar riêng phía trên.
     - Không tạo Online Counter riêng bên dưới.
     - Dưới cùng Header là dải hoa văn KbachDivider tinh tế.
     - **Khi chưa Login (Unauthenticated)**:
       - Hiển thị: `[Avatar]` + `Khách vãng lai` + `[Đăng nhập]`.
     - **Khi đã Login (Authenticated)**:
       - Hiển thị: `[Avatar]` + `[Tên kỳ thủ]` + `[Đăng xuất]`.
     - Ẩn thanh Header / Auth trong màn hình ván cờ (Play & Online Match Arena) để bàn cờ có không gian lớn nhất.
  2. **Logout State & Quản lý bộ nhớ**:
     - Khi bấm Đăng xuất: Xóa sạch `displayName`, token, và state trong memory/storage; giao diện lập tức chuyển về Guest.
     - Refresh trang sau logout: Vẫn giữ trạng thái Guest.
     - Đăng nhập lại: Tên kỳ thủ hiển thị chính xác.
  3. **Cổng kiểm soát Online (Auth Gate)**:
     - Khách vãng lai: Bị chặn và hiển thị yêu cầu đăng nhập trước khi vào Đấu Online.
     - Người dùng đã đăng nhập: Vào sảnh ghép trận bình thường.
  4. **Hiệu ứng Checkmate “អុក” (Calligraphy Splash)**:
     - Hiển thị duy nhất từ: **“អុក”**.
     - Bỏ toàn bộ: "អុកដាច់", "CHECKMATE", thẻ card, khung border, background box.
     - Typography: Thư pháp Khmer font `Moul`, kích thước lớn (~3× kích thước thông thường).
     - Hiệu ứng animation CSS: Xuất hiện nhanh → peak hào quang vàng kim → fade out mượt mà trong đúng 3 giây rồi biến mất hoàn toàn.
     - `pointer-events: none`: Tuyệt đối không chặn thao tác click/chạm trên bàn cờ.
  5. **Kiểm thử & Build**:
     - `npm run build`: Hoàn thành 100%.
     - Unit tests: 123/123 tests PASSED.

---

## Stage 29 — Production Hardening & Live Verification

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Kết quả thực hiện**:
  1. **Smoke Test Navigation Toàn Diện**:
     - Kiểm thử luồng hoàn chỉnh: Login/Profile → Home → Online Lobby → Matchmaking / Private Room → Online Match Arena → Game Over → Rematch (đổi màu quân) / Back to Home.
  2. **Kiểm thử Luật Online Thực tế (Real-World Online Rules)**:
     - **Folk / Traditional 60m + AFK**: 60 phút tổng, 3 lần cảnh báo AFK (2m, 2m, 1m).
     - **International 60m + AFK**: 60 phút tổng, 3 lần cảnh báo AFK.
     - **International Blitz 5m**: 5 phút tổng, **KHÔNG AFK** (`afkEnabled=false`).
     - **Đầu hàng (Resign)**: Xác nhận đối thủ thắng ngay lập tức.
     - **Cầu hòa (Draw)**: Gửi lời mời hòa, chấp nhận hoặc từ chối chính xác.
     - **Đấu lại (Rematch)**: Tự động đổi màu quân (Trắng ↔ Đen) và khởi động ván mới.
     - **Mất kết nối / Khóa màn hình (Device Sleep & Wake)**: Không xử thua ngay lập tức; duy trì session token và khôi phục ván đấu sau khi mở khóa.
  3. **Tối ưu Giao diện & Âm thanh**:
     - Player card của người chơi đang đến lượt phát sáng toàn bộ viền và ánh hào quang (Vàng kim cho người chơi, Hổ phách cho đối thủ).
     - Không lặp âm thanh (move, capture, promotion được đồng bộ chính xác).
     - Hiệu ứng hình ảnh và âm thanh khi Chiếu hết (Checkmate banner & checkmate SFX).
     - Âm thanh cảnh báo đếm ngược 10 giây cuối lượt.
     - Giữ nguyên giao diện đấu trường không có thanh điều hướng thừa (no header/footer trong game arena).
  4. **Kết quả Kiểm thử Live Production**:
     - Chạy thành công toàn bộ kịch bản E2E trên live backend Railway (`https://ouk-khmer-backend-production.up.railway.app`).

---

## Stage 28 — Real Production Deployment (Vercel + Railway)

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Kết quả thực hiện**:
  1. **Frontend Production Deployment (Vercel)**:
     - Production URL: `https://ouk-khmer-online.vercel.app`
     - Deployment URL: `https://ouk-khmer-online-lxgb6o8x2-ouk-khmer-online.vercel.app`
     - Cấu hình biến môi trường: `VITE_ONLINE_SERVER_URL=https://ouk-khmer-backend-production.up.railway.app`
  2. **Backend Production Deployment (Railway)**:
     - Production URL: `https://ouk-khmer-backend-production.up.railway.app`
     - Healthcheck: `/health` (HTTP 200 OK - Active & Healthy)
     - Cấu hình biến môi trường: `CORS_ORIGIN=https://ouk-khmer-online.vercel.app,https://ouk-khmer-online-lxgb6o8x2-ouk-khmer-online.vercel.app`
  3. **Real E2E Multiplayer Verification**:
     - Kiểm thử thành công 2 client thiết bị kết nối qua WSS, tạo phòng riêng 6 số PIN, tham gia trận đấu, di chuyển quân thời gian thực và đồng thuận cầu hòa (`game:over`).
  4. **Regression & Build**:
     - 42/42 Auth tests passed, 80/80 Core tests passed, Real E2E tests passed 100%.

---

## Stage 27 — Production Deployment & Architecture Audit

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Kết quả thực hiện**:
  1. **Kiểm tra kiến trúc Frontend**:
     - Ứng dụng SPA tĩnh (React 19 + Tailwind CSS v4) tương thích hoàn toàn để deploy lên Vercel, Netlify, Cloudflare Pages hoặc CDN tĩnh.
  2. **Kiểm tra kiến trúc Socket.IO Server**:
     - Server là ứng dụng Node.js stateful với authoritative clock, countdown timer, phòng đấu và queue trong RAM.
     - **Không phù hợp chạy trên Vercel Serverless Functions** (do giới hạn kết nối stateless và timeout ngắn).
     - Đã cấu hình độc lập `server/start.ts` (`npm run server:start`) với `railway.json` và `/health` endpoint sẵn sàng deploy lên Railway / Cloud Run / Render.
  3. **CORS, WebSocket/WSS & Biến môi trường**:
     - Client hỗ trợ `VITE_ONLINE_SERVER_URL` & `VITE_SOCKET_URL` với fallback tự động về `window.location.origin`.
     - Server hỗ trợ cấu hình `CORS_ORIGIN` đa domain an toàn.
  4. **Firebase & Google OAuth Production**:
     - Xác nhận cấu hình Firebase Authorized Domains cho domain production.
  5. **Kiểm tra tự động & Build**:
     - 42/42 Auth tests passed, 80/80 Core tests passed, 15/15 Runtime tests passed, 48/48 Asset checks passed, `npm run build` thành công 100%.

---

## Stage 26 — Real Auth & Online End-to-End Verification

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Kết quả thực hiện**:
  1. **Google Login Live Endpoint**:
     - Identity Toolkit API `accounts:createAuthUri` trả về `200 OK` với OAuth URI hợp lệ của Google và Client ID từ `project-by-khang`.
  2. **Email/Password & Facebook Auth Status**:
     - Email/Password trả về `OPERATION_NOT_ALLOWED` chính xác do cần gạt toggle trong Firebase Console.
     - Facebook Login giữ nguyên trạng thái BLOCKED và xử lý lỗi graceful.
  3. **Firestore User Profile Sync**:
     - Cấu trúc `UserProfile` đồng bộ an toàn qua Firestore Client SDK và server timestamps.
  4. **Anti-Spoofing & UID Security**:
     - Socket.IO xác thực token máy chủ, loại bỏ hoàn toàn các payload mạo danh từ client.
  5. **Session Lifecycle & Reconnect**:
     - Khởi tạo session token `st_*`, khôi phục session an toàn khi reload trình duyệt, từ chối token hết hạn khi logout.
  6. **Kiểm tra tự động**:
     - `npm run test:auth`: 42/42 tests passed.
     - `test-multiplayer-core.ts`: 80/80 tests passed.
     - `test-multiplayer-runtime.ts`: 15/15 socket runtime tests passed.
     - `check:assets`: 48/48 asset checks passed.
     - `npm run build`: Build succeeded 100%.

---

## Stage 25D — Firebase Provisioning & Production Configuration Activated

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Kết quả thực hiện**:
  1. **Firebase Provisioning**:
     - Kích hoạt thành công dự án Firebase `project-by-khang` thông qua official integration.
     - Tự động sinh `firebase-applet-config.json` với `projectId`, `appId`, `apiKey`, `authDomain`, `firestoreDatabaseId`, `oAuthClientId`.
  2. **Security Rules Deployment**:
     - Triển khai thành công `firestore.rules` lên Firestore Native database `ai-studio-oukkhmeronline-bf9c8f38-eb74-4b5e-bcbd-efb1abfaeebc`.
  3. **Client Configuration**:
     - `src/lib/firebase.ts` tích hợp trực tiếp file cấu hình dự án chính thức.
  4. **Google & Multi-Provider Auth**:
     - Google OAuth sẵn sàng 100% với Web Client ID và Project API Key.
     - Facebook OAuth giữ nguyên BLOCKED (chờ Meta App credentials).
  5. **Kiểm tra tự động**:
     - `npm run test:auth`: 28/28 tests passed.
     - `test-multiplayer-core.ts`: 80/80 tests passed.
     - `test-multiplayer-runtime.ts`: 15/15 socket runtime tests passed.
     - `check:assets`: 48/48 asset checks passed.
     - `npm run build`: Build succeeded 100%.

---

## Stage 25C — Real Firebase Project Configuration & Google Login Audit

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Tình trạng thực tế**:
  1. **Google Login REAL Status**: **BLOCKED (Client integration 100% complete, awaiting real Firebase production project keys in Environment Secrets)**.
  2. **Facebook Login Status**: **BLOCKED (Awaiting Facebook App ID / Secret)**.
  3. **Yêu cầu cấu hình Production cần A cung cấp**:
     - `VITE_FIREBASE_API_KEY`: API Key lấy từ Firebase Console
     - `VITE_FIREBASE_AUTH_DOMAIN`: `<project-id>.firebaseapp.com`
     - `VITE_FIREBASE_PROJECT_ID`: Firebase Project ID
     - `VITE_FIREBASE_STORAGE_BUCKET`: `<project-id>.appspot.com`
     - `VITE_FIREBASE_MESSAGING_SENDER_ID`: Cloud messaging sender ID
     - `VITE_FIREBASE_APP_ID`: Web App ID (1:xxx:web:yyy)
     - **Authorized Domains**: Thêm domain runtime (`https://ais-dev-4n7ziqgsb3b4cgayo2h2jw-53760875482.asia-east1.run.app`, `https://ais-pre-4n7ziqgsb3b4cgayo2h2jw-53760875482.asia-east1.run.app`, `localhost`) vào Firebase Console Authentication Settings.
  4. **Kiểm tra tự động**: 25/25 Auth tests passed, 80/80 core tests passed, 15/15 runtime socket tests passed, build succeeded 100%.

---

## Stage 25B — Firebase Production Config & Real Google Login Audit

- **Ngày thực hiện**: 2026-08-30
- **Branch**: `online-multiplayer`
- **Nội dung thực hiện**:
  1. **Firebase Blueprint & Error Diagnostics**:
     - Tạo file đặc tả intermediate representation `firebase-blueprint.json` chứa `UserProfile` và `MatchRecord`.
     - Tạo bộ xử lý lỗi tiêu chuẩn Firestore `handleFirestoreError` trong `src/lib/firebase-error.ts`.
  2. **Audit Google Login & Token Pipeline**:
     - Thiết lập `GoogleAuthProvider` với `prompt: "select_account"`.
     - Kiểm tra toàn bộ chuỗi: `Google Sign-in` -> `getIdToken()` -> `Socket Connection` -> `Server JWT Decoder (auth-verifier.ts)` -> `Room PlayerInfo Metadata`.
  3. **Facebook Login Status**:
     - Giữ nguyên trạng thái thực tế: UI hỗ trợ nhưng sẽ báo lỗi rõ ràng nếu môi trường chưa cung cấp Facebook App ID; không giả lập PASS khi chưa có credentials.
  4. **Production Configuration Requirements**:
     - Bổ sung định nghĩa đầy đủ các biến môi trường Firebase trong `.env.example`:
       - `VITE_FIREBASE_API_KEY`
       - `VITE_FIREBASE_AUTH_DOMAIN`
       - `VITE_FIREBASE_PROJECT_ID`
       - `VITE_FIREBASE_STORAGE_BUCKET`
       - `VITE_FIREBASE_MESSAGING_SENDER_ID`
       - `VITE_FIREBASE_APP_ID`
     - Lưu ý: Cần thêm các domain chạy app (ví dụ `*.run.app`, `localhost`) vào mục **Authorized Domains** trong Firebase Console Authentication Settings.
  5. **Automated Test Coverage**:
     - Mở rộng `scripts/test-auth.ts` lên **25/25 tests** (bổ sung giải mã JWT payload, trích xuất claim `email_verified`, gắn identity Google user vào server room).

---

## Stage 25 — Authentication & Account System (Firebase Auth + Firestore)

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-30
- Branch: `online-multiplayer`
- Mục tiêu: Hoàn thiện hệ thống tài khoản sản xuất sử dụng Firebase Authentication và Firestore:
  1. **Firebase Auth & Session Management**:
     - Hỗ trợ Email/Password đăng ký, đăng nhập, đăng xuất, gửi email xác thực và quên/đặt lại mật khẩu.
     - Đăng nhập OAuth một chạm bằng Google & Facebook.
     - Tự động duy trì phiên đăng nhập (session persistence) và cập nhật token khi tái kết nối.
  2. **Firestore User Database & Security Rules**:
     - Lưu trữ hồ sơ người dùng tại collection `users/{uid}` gồm `uid`, `email`, `displayName`, `photoURL`, `emailVerified`, `createdAt`, `updatedAt`.
     - Tuyệt đối không lưu plaintext password trong Firestore.
     - `firestore.rules` khóa chặt quyền truy cập: người dùng chỉ có quyền đọc/ghi dữ liệu tài khoản của chính mình.
  3. **Server-side Token Verification & Anti-Spoofing (`server/auth-verifier.ts`)**:
     - Socket server xác thực Firebase ID Token qua `verifyToken` trong các event matchmaking và private room.
     - Gắn metadata danh tính (`uid`, `photoURL`, `emailVerified`) vào cấu trúc `PlayerInfo` chính thức trên server.
     - Ngăn chặn triệt để hành vi giả mạo `sessionToken` trong luồng reconnect.
  4. **Giao diện & Đa ngôn ngữ (UI & I18n)**:
     - `AuthModal` & `UserProfileCard` tích hợp mượt mà tại Settings và Online Lobby.
     - Bản dịch đầy đủ cho 6 ngôn ngữ: English, Khmer, Vietnamese, French, Thai, Chinese.
  5. **Kiểm thử tự động**:
     - Script kiểm thử `scripts/test-auth.ts` đạt 17/17 pass (100%).

---

## Stage 24 — Online Observability + Operator Diagnostics

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Mục tiêu: Thiết lập hệ thống observability và chẩn đoán vận hành cho hệ thống Online Multiplayer:
  1. **Server Logging có cấu trúc (`server/logger.ts`)**: Chuẩn hóa các event quan trọng trong chu trình ván đấu (tạo/vào phòng, ghép trận, bắt đầu, nước đi, từ chối nước đi, hết giờ, phạt AFK, ngắt/nối kết nối, cầu hòa, đầu hàng, đấu lại, kết thúc ván, dọn dẹp phòng).
  2. **Bảo mật và an toàn dữ liệu**: Tự động mask các trường nhạy cảm như `sessionToken`, `secret`, `key`, `password`. Bounded circular buffer 2000 bản ghi ngăn ngừa rò rỉ bộ nhớ.
  3. **Correlation / Room Trace**: Mỗi log ghi nhận đầy đủ `timestamp`, `level`, `event`, `roomId`, `socketId`, `color`, `playerName`, `details` giúp truy vết trọn vẹn toàn bộ một trận đấu từ lúc tạo phòng đến khi dọn dẹp.
  4. **Error Diagnostics**: Chuẩn hóa mã lỗi rõ ràng và có cấu trúc.
  5. **Endpoint `/health` nâng cao**: Trả về dữ liệu metrics thời gian thực (`activeRooms`, `activePins`, `socketMappings`, `matchmakingQueue`, `bufferedLogs`, `uptime`).
  6. **Client Diagnostics**: Buffer 100 event vào/ra gần nhất, hỗ trợ debug mode qua URL hoặc localStorage mà không làm ảnh hưởng UI sản phẩm.

---

## Stage 22A — Corrective Audit & Soak Verification

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Mục tiêu: Thực hiện kiểm toán chuyên sâu và khắc phục các lỗ hổng theo yêu cầu Stage 22A:
  1. **An toàn dọn dẹp phòng (Room Cleanup Safety)**: Bảo vệ tuyệt đối phòng đang ở trạng thái `playing`, không bao giờ thu hồi/xóa phòng chỉ vì thời gian tạo > 30 phút. Bảo toàn nguyên vẹn mã PIN, socket mapping, turn timer và trạng thái bàn cờ.
  2. **Kiểm thử bất đồng bộ & tương tranh thực tế (True Concurrency & Race Conditions)**: Kiểm thử với 2 socket độc lập gửi nước đi đồng thời. Đảm bảo đúng 1 nước đi được chấp nhận, nước thứ 2 bị từ chối với `NOT_YOUR_TURN`, không gây đột biến trùng lặp trong lịch sử nước đi hoặc trạng thái bàn cờ.
  3. **Khóa an toàn socket cũ (Stale Socket Security)**: Khi người chơi tái kết nối bằng socket mới, socket cũ bị trục xuất khỏi room channel (`leave(room.id)`), mọi thao tác gửi nước đi, chat, cầu hòa từ socket cũ đều bị từ chối với `NOT_IN_ROOM`.
  4. **Đồng bộ trạng thái phiên phục hồi (Session Recovery State Parity)**: Đảm bảo độ đồng nhất 100% giữa Server, Client A (vừa kết nối lại) và Đối thủ B về bàn cờ, lượt đi, đồng hồ, luật chơi và điểm phạt AFK.
  5. **Toàn vẹn Timer & Dọn dẹp (Timer/Cleanup Integrity)**: Đảm bảo mỗi phòng chỉ duy trì đúng 1 timer hoạt động, không bị rò rỉ timer khi đổi lượt. Phòng đã kết thúc có 0 timer hoạt động.
  6. **Soak Test 20 phòng liên tục**: Chạy chu kỳ 20 phòng xuyên suốt Random Matchmaking và Private Room, kiểm chứng 0 phòng mồ côi, 0 mã PIN rác và 0 socket mapping tồn dư trong bộ nhớ.

---

## Stage 22 — Production Hardening & Desync/Concurrency QA

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Mục tiêu: Kiểm toán toàn diện hệ thống Multiplayer về độ ổn định sản xuất, khử lệch trạng thái (desync), phòng chống tấn công/gian lận phía client, xử lý tương tranh và dọn dẹp bộ nhớ.

## Stage 21B — Online Match Audio, Turn UI & Device Sleep/Resume Fix

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Mục tiêu: Khắc phục âm thanh nền bị phát trùng/chồng lấn, bổ sung âm thanh đếm lùi khẩn cấp 10s và âm thanh chiếu tướng, tích hợp banner chiếu tướng trực quan, nâng cấp hiệu ứng viền/thẻ sáng cho người chơi đang tới lượt, và hoàn thiện cơ chế khôi phục phiên thi đấu khi thiết bị tắt màn hình/ngủ hoặc chuyển ứng dụng nền mà không bị xử thua oan.

### Các thành phần đã triển khai & Kiểm tra

1. **Khắc phục Background Audio lồng tiếng**:
   - Sử dụng cơ chế quản lý singleton `AudioManager` với requestId tăng đơn điệu (`bgmRequestId`).
   - Đảm bảo chỉ có duy nhất 1 luồng phát nhạc nền hoạt động tại một thời điểm, dừng sạch source cũ trước khi phát source mới.
2. **Hệ thống SFX đếm lùi & chiếu tướng**:
   - Thêm hiệu ứng âm thanh `countdown_warning` khi thời gian lượt đi của người chơi còn dưới hoặc bằng 10 giây.
   - Tự động phát âm thanh `check` khi người chơi bị chiếu tướng.
3. **Banner chiếu tướng trực quan**:
   - Tích hợp cờ `showCheckBanner` trên bàn cờ trong trận đấu trực tuyến khi `isCheck` được kích hoạt.
4. **Giao diện thẻ người chơi đang tới lượt**:
   - Nâng cấp viền vàng/hổ phách phát sáng và hiệu ứng xung động (`gold/amber glow aura`, ring border, animated badge) rõ ràng cho thẻ người chơi hoặc đối thủ khi đến lượt.
5. **Cơ chế khôi phục phiên khi thiết bị ngủ / chuyển tab (Session Recovery)**:
   - Server cấp `sessionToken` bảo mật cho mỗi người chơi khi bắt đầu trận.
   - Khi socket bị ngắt tạm thời (do màn hình tắt, thiết bị sleep, hoặc mạng rớt), server không xử thua ngay mà giữ nguyên trận đấu, đồng hồ và lượt đi.
   - Khi người chơi mở lại thiết bị hoặc tab hoạt động (`visibilitychange` / socket reconnect), client tự động gửi `game:reconnect` với `roomId` và `sessionToken` để khôi phục toàn bộ trạng thái ván đấu.
   - Đối thủ nhận thông báo trạng thái kết nối (`player:status`) khi người chơi đang kết nối lại.
   - Khi kết thúc trận hoặc người chơi chủ động bấm đầu hàng/rời phòng, phiên được dọn dẹp sạch sẽ.

---

## Stage 21 — Online Match Experience + Ruleset/AFK Correction

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Mục tiêu: Tối ưu toàn diện trải nghiệm thi đấu trực tuyến (loại bỏ header/footer thừa trong trận, thanh điều khiển ngang tiện ích, thẻ người chơi hiển thị đồng hồ trận + đếm lùi AFK + hiệu ứng glow, khóa điều hướng khi đang thi đấu, quy trình cầu hòa và đấu lại hai chiều, chuẩn hóa 3 chế độ thời gian với loại trừ AFK cho Blitz 5m, hỗ trợ i18n 6 ngôn ngữ).

### Các thành phần đã triển khai & Kiểm tra

1. **Giao diện thi đấu Không phân tâm (Distraction-Free Arena)**:
   - Loại bỏ hoàn toàn header & footer chung khi đang trong trận đấu (`matchStatus === "playing"`).
   - Bố cục responsive tối ưu cho mobile/tablet, ưu tiên toàn bộ không gian cho bàn cờ mà không bị cuộn dọc thừa.
2. **Thanh điều khiển nhanh dạng ngang (Horizontal Quick Controls)**:
   - Nút bật/tắt âm thanh nhanh (Loa).
   - Nút chọn kiểu quân cờ (Cambodian Ivory, Ada Gold, Ada Red).
   - Nút chọn giao diện bàn cờ (Angkor Stone, Royal Ivory, Temple Teak).
3. **Thẻ người chơi nâng cao (Player Cards with Clocks & AFK)**:
   - Hiển thị song song đồng hồ tổng ván đấu và đồng hồ đếm lùi lượt đi AFK.
   - Thẻ người chơi tới lượt có viền sáng ánh kim nổi bật (`gold-pulse glow`).
   - Cảnh báo lỗi AFK (Strikes 1/3, 2/3) chính xác theo lượt.
4. **Quy chuẩn 3 chế độ thời gian (Time Controls & AFK Policies)**:
   - _Folk Ouk (Truyền thống)_: 60 phút tổng + Phạt AFK 2m/2m/1m.
   - _International Ouk (Quốc tế)_: 60 phút tổng + Phạt AFK 2m/2m/1m.
   - _International Blitz (Chớp)_: 5 phút tổng + **KHÔNG áp dụng phạt AFK** (`afkEnabled: false`).
5. **Khóa điều hướng (Navigation Lock)**:
   - Chặn điều hướng rời trang bất ngờ trong trận. Chỉ cho phép 2 lựa chọn: "Nhận thua & Rời" hoặc "Cầu hòa".
6. **Thỏa thuận hòa & Đấu lại (Mutual Draw & Rematch)**:
   - Cầu hòa yêu cầu đối thủ đồng ý (Server-authoritative).
   - Đấu lại (Rematch) yêu cầu cả hai bên đồng thuận; khi kích hoạt sẽ tự động đảo màu quân (Black/White swapping) và reset sạch trạng thái bàn cờ, đồng hồ, lịch sử.
   - Kết thúc trận chỉ có 2 nút: "Về đấu online" (`resetToMenu()`) và "Đấu lại" (`requestRematch()`).
7. **Đa ngôn ngữ & Kiểm thử toàn diện**:
   - 100% i18n hỗ trợ 6 ngôn ngữ (`vi`, `en`, `km`, `th`, `fr`, `zh`).
   - Giữ nguyên 100% gameplay và tính năng offline.

---

## Stage 10 — Android APK & Mobile WebView Audit

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-23
- Branch: `online-multiplayer`
- Loại kiểm tra: Read-Only Audit (Không sửa mã nguồn, không sửa asset, không cài đặt package, không thay đổi Android config).
- Trạng thái: Checkpoint ghi nhận hiện trạng hệ thống trước khi triển khai Stage 10.

### Kết quả Audit Chi tiết

1. **Android / Capacitor Configuration (CI Discovery)**:
   - Workspace cục bộ không chứa thư mục `android/` hay file `capacitor.config.*` (môi trường CI sinh động khi build).
   - CI Workflow (`.github/workflows/main.yml`) cấu hình:
     - Capacitor: `@capacitor/core@7`, `@capacitor/cli@7`, `@capacitor/android@7`.
     - Application ID / Namespace: `com.nguyencongthanhfbb.khmerouk`.
     - App Name: `Khmer Ouk`.
     - Web Directory: `.output/public` (Vite SPA output, `bundledWebRuntime: false`).
     - Java / Gradle: Java 21 (Temurin), `./gradlew assembleDebug --no-daemon`.
     - Icon System: Giải nén từ `IconKitchen-Output.zip`, chuẩn hóa các asset `ic_launcher` và adaptive XML `mipmap-anydpi-v26`.

2. **Mobile WebView Compatibility Assessment**:
   - **Routing**: `src/main.tsx` sử dụng `createHashHistory()`, tương thích hoàn hảo với WebView cục bộ (`https://localhost/` hoặc `file://`), không bị lỗi HTTP 404 khi người dùng reload hay chuyển trang.
   - **Viewport & Touch**: `index.html` cấu hình meta tag `viewport-fit=cover, user-scalable=no, maximum-scale=1.0`. Board sử dụng CSS Grid và pointer events tiêu chuẩn, touch targets đảm bảo khả năng tương tác mượt mà trên màn hình di động.
   - **Web Audio System**: `src/lib/audio/audio-manager.ts` xử lý cơ chế mở khóa AudioContext khi có tương tác người dùng đầu tiên (`pointerdown`, `touchstart`, `keydown`). Sử dụng bộ đệm singleton low-allocation đảm bảo không tràn RAM hay rò rỉ AudioContext trên Android WebView.
   - **Offline Engine & Assets**: `src/lib/khmer-chess.ts` và AI Web Worker (`src/workers/ai.worker.ts`) chạy 100% offline. Tài nguyên nhị phân văn hóa (mascot, angkor hero, khmer audio, SVG pieces) bảo toàn nguyên vẹn cấu trúc nhị phân và vượt qua 48/48 asset integrity checks.

3. **Multiplayer in Mobile WebView & Identified Blockers**:
   - `src/lib/online-client.ts` mặc định kết nối tới `window.location.origin`. Trong Android APK / Capacitor, `origin` là `https://localhost`, do đó **bắt buộc cần cấu hình endpoint Socket.IO server ngoại vi (Production Endpoint)** để client kết nối tới server online.
   - Cơ chế Reconnect và Rate Limiting hoạt động độc lập với browser và tương thích với chu kỳ background/foreground của mobile app.

4. **Planning Requirements for Stage 10**:
   - Stage 10 implementation acceptance criteria are not yet fully specified in repository documentation.
   - Cần lập kế hoạch triển khai Stage 10 chi tiết (Acceptance Criteria, APK environment configuration, Socket URL injection, Android lifecycle handling) trước khi viết code.

---

## Stage 9 — Matchmaking Queue

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-23
- Branch: `online-multiplayer`
- Mục tiêu: Triển khai hàng đợi ghép trận trực tuyến tự động (Authoritative Matchmaking Queue) cho chế độ Quick Match với Socket.IO và UI Radar Scanner.

### Các thành phần đã triển khai

1. **Server Matchmaking Engine (`server/room-manager.ts`, `server/room-types.ts`, `server/index.ts`)**:
   - `joinQueue`: Thêm người chơi vào hàng đợi FIFO, ngăn chặn duplicate entry, xác thực tên người chơi, gán timer và rate limiter.
   - `leaveQueue`: Hủy yêu cầu ghép trận, giải phóng khỏi hàng đợi an toàn.
   - `getQueueStatus`: Trả về số lượng người chơi đang chờ và vị trí trong hàng đợi.
   - `processMatchmaking`: Cơ chế tự động ghép cặp 2 người chơi đầu tiên trong hàng đợi FIFO, phân bổ ngẫu nhiên bên Trắng ('w') và Đen ('b'), tạo phòng đấu và tự động chuyển sang trạng thái `ready_check`.
   - Idempotency & Lifecycle Safety: Tự động dọn dẹp hàng đợi khi socket disconnect, tạo phòng riêng PIN hoặc join phòng PIN.
   - Rate limiting cho hàng đợi (`maxQueueAttempts`, `queueWindowMs`) trả về `RATE_LIMITED` nếu spam.

2. **Client Layer (`src/lib/online-client.ts`, `src/lib/online-types.ts`, `src/hooks/useOnlineGame.ts`)**:
   - Tích hợp các hàm `joinQueue`, `leaveQueue`, `getQueueStatus` vào `OnlineClient`.
   - Xử lý các sự kiện `queue:joined`, `queue:matched`, `queue:left`, `queue:status`, `queue:error`.
   - Hook `useOnlineGame` hỗ trợ màn hình `matchmaking`, quản lý trạng thái ghép trận, đếm thời gian trôi qua và tự động hủy khi rời màn hình.

3. **Frontend UI (`src/routes/online.tsx`)**:
   - Bổ sung thẻ "Quick Match" (Ghép trận nhanh) trong Lobby.
   - Màn hình `matchmaking` trực quan với hiệu ứng Radar Scanner, hiển thị số người đang tìm trận, thời gian tìm kiếm và nút "Cancel Search".

### Kết quả Kiểm thử Stage 9

- **Stage 9 Matchmaking Test Suite (`server/test-stage9-matchmaking.ts`)**: 12/12 Scenarios (28/28 Assertions) PASSED (100%)
- **Stage 8 Lifecycle Hardening (`server/test-stage8-room-lifecycle.ts`)**: 20/20 Scenarios (39/39 Assertions) PASSED (100%)
- **Stage 7 Lifecycle (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
- **Stage 6 Reconnection (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Stage 4 Multiplayer & E2E (`server/test-stage4.ts`, `server/test-e2e-room-client.ts`)**: 12/12 PASSED (100%)
- **Realtime Gameplay (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Stage 3 Server Engine (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room System (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Asset Integrity Verification (`npm run check:assets`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Frontend & Server Build (`npm run build`)**: Thành công 100%

## Stage 8 — Matchmaking & Room Lifecycle Hardening

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-22
- Branch: `online-multiplayer`
- Implementation Commit: `1aafc01` (`feat(online): stage 8 matchmaking and room lifecycle hardening`)
- Documentation Finalization Commit: `878310a` (`docs(online): finalize stage 8 development log and ai bridge`)
- Push Status: `SUCCESS — origin/online-multiplayer`
- Base Commit: `abbff8a`
- Mục tiêu: Hardening toàn diện hệ thống matchmaking, bảo mật mã PIN phòng, chống brute-force/spam bằng rate limiting, bảo vệ session token và quản lý vòng đời (lifecycle) phòng chơi sạch sẽ không rò rỉ tài nguyên.

### Các thành phần đã triển khai & gia cố (Hardened)

1. **PIN Security & Collision Resilience (`server/room-manager.ts`)**:
   - Mã PIN 6 chữ số số học ngẫu nhiên (`000000` - `999999`) bảo mật cao.
   - Cơ chế phát hiện và xử lý va chạm (collision retry loop) hỗ trợ custom generator cho unit tests và đảm bảo 100% tính duy nhất của mã PIN.
   - Validation nghiêm ngặt định dạng PIN (độ dài đúng 6 ký tự số, từ chối ký tự chữ, null, undefined với `INVALID_PIN`).

2. **Rate Limiting & Anti-Spam Architecture (`server/room-manager.ts`, `server/room-types.ts`, `src/lib/online-types.ts`)**:
   - Cấu trúc `RateLimitBucket` dạng sliding window tracking theo từng hành vi:
     - `create`: Giới hạn số lần tạo phòng trên mỗi kết nối/IP trong khoảng thời gian nhất định (mặc định 10 phòng / 60s).
     - `join`: Giới hạn số lần thử PIN sai liên tiếp để chống tấn công brute-force quét mã PIN (mặc định 10 lần sai / 60s).
     - `reconnect`: Giới hạn số lần thử reconnect thất bại với token sai.
   - Trả về mã lỗi chuẩn `RATE_LIMITED` khi vượt ngưỡng cho phép, đồng thời tự động reset bucket khi người chơi join thành công.

3. **Session & Concurrency Integrity (`server/room-manager.ts`, `server/index.ts`)**:
   - Chặn Duplicate Join: Khi một socket cố gắng join phòng mới khi đang ở phòng khác, server tự động cho rời phòng cũ sạch sẽ trước khi vào phòng mới.
   - Chặn Concurrent Join: Khi có nhiều request join đồng thời vào slot cuối (`color: 'b'`), server xử lý tuần tự atomic, chỉ 1 người nhận được slot 'b', người còn lại nhận mã lỗi `ROOM_FULL`.
   - Token & Room Isolation: Token cấp phát cho Room A khi dùng để reconnect vào Room B sẽ bị từ chối với `INVALID_TOKEN`.
   - Socket Authority Invalidation: Khi người chơi reconnect với socket mới, socket cũ bị hủy quyền điều khiển ván đấu (`oldSession === undefined`), chỉ socket mới có quyền thực thi.

4. **Lifecycle & Timer Cleanup Hardening (`server/room-manager.ts`)**:
   - Host rời phòng ở trạng thái `waiting` -> phòng bị xóa ngay lập tức, không để lại zombie room trong bộ nhớ.
   - Quản lý chính xác `cleanupTimer` (waiting room TTL) và `disconnectTimer` (grace period timeout): Timer được clear kịp thời khi đối thủ vào phòng, khi người chơi reconnect hoặc khi phòng đóng.
   - Active Match Protection: Waiting room TTL bị hủy bỏ hoàn toàn khi trận đấu bắt đầu; timer TTL không thể xóa nhầm phòng đang chơi (`status === 'playing'`).
   - Reconnect Grace Period Safety: Phòng đang trong thời gian grace period được bảo vệ an toàn, không bị xóa sớm trước khi timer forfeit kết thúc.
   - Ghost Match Prevention: Khi 1 người chơi gửi yêu cầu rematch nhưng đối thủ rời phòng trước khi đồng ý, server hủy bỏ rematch và chuyển phòng sang `closed`, tuyệt đối không tạo ra trận đấu ma (ghost match).

### Kết quả Kiểm thử Stage 8

- **Stage 8 Lifecycle Hardening Test Suite (`server/test-stage8-room-lifecycle.ts`)**: 20/20 Scenarios PASSED (39/39 Assertions, 100%)
  - Test 1: Tạo phòng -> PIN 6 chữ số hợp lệ và session host 'w'. -> PASS
  - Test 2: PIN collision simulation -> retry và tạo PIN duy nhất thành công. -> PASS
  - Test 3: Validate định dạng PIN (chữ cái, 5 số, không tồn tại). -> PASS
  - Test 4: Chặn người chơi thứ 3 vào phòng đủ 2 người (`ROOM_FULL`). -> PASS
  - Test 5: Duplicate join rời phòng cũ an toàn không duplicate player. -> PASS
  - Test 6: Host rời phòng waiting -> xóa phòng ngay, không có zombie room. -> PASS
  - Test 7: Phòng waiting hết hạn TTL -> tự động dọn dẹp sạch sẽ. -> PASS
  - Test 8: Rời phòng trong `ready_check` -> chuyển status sang `closed`, thông báo cho đối thủ. -> PASS
  - Test 9: Rời phòng sau khi kết thúc trận -> đóng phòng sạch sẽ. -> PASS
  - Test 10: Rematch đồng thời với đối thủ rời phòng -> chống tạo game ma. -> PASS
  - Test 11: Reconnect vào phòng đã hết hạn -> trả về `ROOM_NOT_FOUND`. -> PASS
  - Test 12: Duplicate reconnect event là hoàn toàn idempotent và an toàn. -> PASS
  - Test 13: Dùng token Room A vào Room B bị từ chối `INVALID_TOKEN`. -> PASS
  - Test 14: Socket cũ sau reconnect mất quyền điều khiển, socket mới có toàn quyền. -> PASS
  - Test 15: Concurrent joins -> duy nhất 1 người nhận slot 'b', người kia nhận `ROOM_FULL`. -> PASS
  - Test 16: Rate limit khi thử PIN sai liên tiếp -> trả về `RATE_LIMITED`. -> PASS
  - Test 17: Rate limit khi spam tạo phòng -> trả về `RATE_LIMITED`. -> PASS
  - Test 18: Match đang chơi được bảo vệ khỏi waiting room TTL cleanup. -> PASS
  - Test 19: Reconnect trong grace period an toàn, không bị dọn dẹp sớm. -> PASS
  - Test 20: Toàn bộ vòng đời (Create -> Join -> Ready -> Play -> Finish -> Rematch -> Finish -> Leave -> Cleanup) hoàn hảo. -> PASS
- **Stage 7 Lifecycle Test Suite (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
- **Stage 6 Reconnection Test Suite (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Stage 4 E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room System Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Realtime Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Asset Integrity Verification (`npm run check:assets`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Build & Compilation (`npm run build`)**: Thành công 100%

## Stage 7 — Ready Check, Rematch & Post-Match Lifecycle

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-22
- Branch: `online-multiplayer`
- Base Commit: `1c243ae`
- Mục tiêu: Triển khai toàn diện Ready Check, Rematch, và Post-Match Lifecycle giữa hai người chơi online dưới sự kiểm soát authoritative của server.

### Các thành phần đã triển khai

1. **Server Architecture (`server/room-manager.ts`, `server/room-types.ts`, `server/index.ts`)**:
   - `ready_check` state: Khi người chơi thứ 2 vào phòng, phòng chuyển sang trạng thái `ready_check` và cả hai nhận thông tin đối thủ.
   - `match:ready` / `match:unready`: Cho phép người chơi toggle trạng thái sẵn sàng. Server quản lý `isReady` độc lập cho từng người chơi và broadcast `match:ready_state`.
   - Authoritative Game Start: Chỉ khi cả 2 người chơi cùng sẵn sàng (`allReady === true`), server mới chuyển status sang `playing` và broadcast `game:start` / `match:started`.
   - Reject move in `ready_check`: Ngăn chặn mọi nước đi khi trận đấu chưa bắt đầu với mã lỗi `GAME_NOT_READY`.
   - `match:rematch`: Quản lý yêu cầu đấu lại sau khi ván đấu kết thúc (`finished`). Khi 1 người yêu cầu, server broadcast `match:rematch_state`. Khi cả 2 cùng đồng ý, server khởi tạo ván cờ mới sạch sẽ (64 ô chuẩn, `turn: 'w'`, `status: 'playing'`) và broadcast `match:rematch_started` kèm `game:start`.
   - Chặn Rematch trước khi kết thúc: Từ chối yêu cầu rematch khi ván cờ đang diễn ra với mã lỗi `GAME_NOT_FINISHED`.
   - State Sync & Reconnect: `match:sync_state` cung cấp đầy đủ thông tin `readyCheck` (trong `ready_check`) hoặc `rematchState` (trong `finished`).
   - Disconnect handling: Quản lý timer forfeit trong cả trạng thái `ready` / `playing` và dọn dẹp phòng sạch sẽ khi người chơi rời phòng.

2. **Client Layer (`src/lib/online-client.ts`, `src/lib/online-types.ts`, `src/hooks/useOnlineGame.ts`)**:
   - Thêm các methods `setReady(ready)`, `requestRematch(rematch)` vào `onlineClient`.
   - Đăng ký và xử lý các sự kiện `match:ready_state`, `match:rematch_state`, `match:rematch_started`.
   - Quản lý state `isReady`, `isOpponentReady`, `isRematchRequested`, `isOpponentRematchRequested`.

3. **Frontend UI (`src/routes/online.tsx`)**:
   - Giao diện Ready Check: Hiển thị trạng thái của người chơi và đối thủ kèm nút "I'm Ready" / "Cancel Ready".
   - Giao diện Game Over & Rematch: Modal kết thúc trận đấu tích hợp nút "Request Rematch" / "Accept Rematch" với phản hồi trạng thái real-time của cả hai bên.

### Kết quả Kiểm thử Stage 7

- **Stage 7 Lifecycle Test Suite (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
  - Test 1: Ready Check - 1 player ready, ván đấu chưa bắt đầu. -> PASS
  - Test 2: Ready Check - Toggle unready hoạt động chính xác. -> PASS
  - Test 3: Ready Check - Cả 2 ready -> ván đấu bắt đầu (`game:start` với bàn cờ 64 ô, `turn: 'w'`). -> PASS
  - Test 4: Move khi đang ở `ready_check` bị từ chối (`GAME_NOT_READY`). -> PASS
  - Test 5: Game kết thúc -> chuyển sang trạng thái `finished` với winner chuẩn xác. -> PASS
  - Test 6: Rematch - 1 player yêu cầu -> broadcast `match:rematch_state` (White=true, Black=false). -> PASS
  - Test 7: Rematch - Cả 2 đồng ý -> broadcast `match:rematch_started`. -> PASS
  - Test 8: Rematch khởi tạo ván đấu mới với trạng thái ban đầu sạch sẽ (`turn: 'w'`, 64 ô). -> PASS
  - Test 9: Rematch khi trận đấu chưa kết thúc bị từ chối (`GAME_NOT_FINISHED`). -> PASS
  - Test 10: Người chơi rời phòng sau trận -> đối thủ nhận thông báo ngắt kết nối. -> PASS
  - Test 11: Reconnect trong trạng thái `ready_check` nhận đúng trạng thái ready của cả 2 bên. -> PASS
  - Test 12: Reconnect trong trạng thái `finished` nhận đúng kết quả và trạng thái rematch. -> PASS
- **Stage 6 Reconnection Test Suite (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Stage 4 E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room System Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Realtime Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Asset Integrity Verification (`npm run check:assets`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Build & Compilation (`npm run build`)**: Thành công 100%

## Stage 6 — Reconnection & Grace Period

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-22
- Branch: `online-multiplayer`
- Mục tiêu: Triển khai toàn diện tính năng Reconnection, Session Recovery, Opponent Presence Tracking, và Grace Period Forfeit Timeout.

### Các thành phần đã triển khai

1. **Server Architecture (`server/room-manager.ts`, `server/room-types.ts`, `server/index.ts`)**:
   - `playerToken`: Tạo chuỗi token ngẫu nhiên mã hóa mạnh cho từng người chơi khi tạo/tham gia phòng.
   - `reconnectPlayer`: Xác thực token + matchId, tái gán socket connection cho phòng, dọn dẹp timer đếm ngược grace period và broadcast sự kiện hiện diện `player:presence (connected: true)`.
   - `handleDisconnect`: Kích hoạt bộ đếm thời gian grace period (mặc định 60s) và broadcast `player:presence (connected: false, gracePeriodSeconds)` đến đối thủ.
   - `handleForfeitTimeout`: Khi grace period kết thúc mà người chơi chưa kết nối lại, server tự động cập nhật kết quả ván cờ thành `finished` với lý do `forfeit` / `disconnect_timeout` và broadcast `game:forfeit` cho phòng.
   - `match:sync_state`: Gửi toàn bộ trạng thái ván đấu hiện tại (bàn cờ 64 ô, lượt đi, trạng thái đếm Viel, kết quả ván đấu, đối thủ, thời gian grace period còn lại) để khôi phục client 100%.

2. **Client Layer (`src/lib/online-client.ts`, `src/lib/online-types.ts`, `src/hooks/useOnlineGame.ts`)**:
   - Lưu trữ session `ouk_online_session` (matchId, roomPin, playerToken, playerColor, playerName) vào local storage khi vào phòng.
   - Tự động gọi `onlineClient.reconnectMatch` khi socket kết nối lại nếu có phiên hoạt động.
   - Xử lý các sự kiện `match:sync_state`, `player:presence`, `game:forfeit`, `match:error`.
   - Quản lý đồng hồ đếm ngược grace period real-time hiển thị trực quan cho người dùng.

3. **Frontend UI (`src/routes/online.tsx`)**:
   - Hiển thị banner cảnh báo khi đối thủ bị ngắt kết nối kèm thời gian đếm ngược forfeit real-time (`Opponent disconnected. Forfeit in Xs...`).
   - Tự động hiển thị kết quả ván đấu và âm thanh chiến thắng/thất bại khi đối thủ bị xử thua do quá thời gian kết nối lại.

### Kết quả Kiểm thử Stage 6

- **Stage 6 Reconnection Test Suite (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
  - Test 1: Tạo phòng, cấp phát playerToken và khởi tạo ván đấu. -> PASS
  - Test 2: Thực thi nước đi ban đầu. -> PASS
  - Test 3: Client A ngắt kết nối, Client B nhận broadcast `player:presence` (connected=false, grace=Xs). -> PASS
  - Test 4: Client A kết nối lại qua socket mới với playerToken, đồng bộ 100% bàn cờ qua `match:sync_state`. -> PASS
  - Test 5: Từ chối token không hợp lệ / giả mạo với mã lỗi `INVALID_TOKEN`. -> PASS
  - Test 6: Grace period timeout kích hoạt tự động xử thua forfeit và broadcast `game:forfeit`. -> PASS
- **Realtime Gameplay Regression Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Asset Integrity Verification (`npm run check:assets`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Build & Compilation (`npm run build`)**: Thành công 100%

## Media Stability & Asset Integrity Fix

### Root Cause Analysis

1. **Root Cause #1 (Piece SVG relative path resolution)**:
   - Trong `src/lib/settings.tsx:54`, hàm `getPieceSrc` trả về đường dẫn tương đối `./pieces/${pieceStyle}/${color}${code}.svg`.
   - Khi chạy ở sub-route (`/online`, `/play`, `/settings`, `/history`), browser request tới `/online/pieces/...` và nhận `text/html` từ Vite SPA fallback thay vì `image/svg+xml`.
   - **Xử lý**: Sửa thành `/pieces/${pieceStyle}/${color}${code}.svg` (absolute path).
2. **Root Cause #2 (Workspace Binary Corruption)**:
   - Các tệp nhị phân trong workspace cục bộ bị biến đổi UTF-8 (`\uFFFD` / `efbfbd...`).
   - **Xử lý**: Khôi phục 100% binary gốc nguyên bản từ GitHub branch `online-multiplayer` (`mascot.png` 1,880,135 bytes, magic `89504e470d0a1a0a`; `angkor-hero.jpg` 129,132 bytes, magic `ffd8ffe000104a46`; `khmer-audio-new.mp3` 3,490,211 bytes, magic `4944330400000000`).
3. **Automated Verification Script (`scripts/check-assets.ts`)**:
   - Thêm script kiểm tra toàn diện 48 tiêu chí: PNG header, JPEG header, MP3 audio header, Favicon ICO header, 42 SVG piece valid markup, và cấm các file legacy.
   - Thêm lệnh `"check:assets": "npx tsx scripts/check-assets.ts"` vào `package.json`.

### Full Regression & Verification Results

- **`npm run check:assets`**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100% - bao gồm 88 offline chess engine tests)
- **Stage 2 Room System Test**: 8/8 PASSED (100%)
- **Stage 3 Server Authoritative Game Engine Test**: 10/10 PASSED (100%)
- **Stage 4 Client-Server Integration Test**: 7/7 PASSED (100%)
- **E2E Room & Client Test**: 5/5 PASSED (100%)
- **Realtime Gameplay Test (2 Independent Clients)**: 6/6 PASSED (100%)
- **Frontend & Server Build (`npm run build`)**: PASSED (100%)
- **HTTP Preview Verification (`/`, `/online`, `/play`, `/settings`, `/history`)**: Toàn bộ routes và media load thành công HTTP 200 với MIME type chính xác.

## Asset State & Integrity Restoration

### Investigation & Root Cause

- **Vấn đề ghi nhận**: Preview bị lỗi broken media (mascot.png, angkor-hero.jpg và các binary assets khác).
- **Nguyên nhân chính xác**:
  - Các tệp nhị phân (`src/assets/mascot.png`, `src/assets/angkor-hero.jpg`, `src/assets/khmer-audio-new.mp3`, `IconKitchen-Output.zip`) trong workspace cục bộ bị hỏng do các byte nhị phân không phải ASCII (như byte magic PNG `\x89` hay JPEG `\xFF\xD8`) bị chuyển đổi thành ký tự thay thế UTF-8 (`\uFFFD` - chuỗi byte `0xEF 0xBF 0xBD`).
  - GitHub remote repository (`https://github.com/machxanht/Ouk-Khmer-Online.git` branch `online-multiplayer`) hoàn toàn bình thường và chứa đầy đủ binary gốc chính xác (mascot.png 1.88MB với PNG header `89504e47`, angkor-hero.jpg 129KB với JPEG header `ffd8ffe0`, khmer-audio-new.mp3 3.49MB với ID3 header `49443304`).
- **Phạm vi bị ảnh hưởng**:
  - Chỉ có workspace cục bộ bị ảnh hưởng dữ liệu nhị phân. GitHub branch `online-multiplayer` không bị hỏng.
  - Toàn bộ 42 tệp quân cờ SVG trong `public/pieces/` và `public/favicon.ico` vẫn hoàn toàn nguyên vẹn.
- **Phương án khôi phục**:
  - Khôi phục trực tiếp các tệp nhị phân gốc từ GitHub branch `online-multiplayer` vào workspace cục bộ (`src/assets/mascot.png`, `src/assets/angkor-hero.jpg`, `src/assets/khmer-audio-new.mp3`, `IconKitchen-Output.zip`).
  - Không tạo asset mới, không dùng placeholder AI, không thay đổi đường dẫn hay import path.
- **Bài học kinh nghiệm (Lesson Learned)**:
  - Tính toàn vẹn của tệp nhị phân/media (Asset Integrity) phải được kiểm tra độc lập và riêng biệt với code tests. Code tests chỉ kiểm tra cú pháp và logic, có thể pass 100% ngay cả khi binary assets bị hỏng header/encoding.
- **Kết quả xác minh (Asset Integrity & Preview)**:
  - `src/assets/mascot.png`: EXISTS, 1,880,135 bytes (authentic PNG header `89504e470d0a1a0a`).
  - `src/assets/angkor-hero.jpg`: EXISTS, 129,132 bytes (authentic JPEG header `ffd8ffe000104a46`).
  - `src/assets/khmer-audio-new.mp3`: EXISTS, 3,490,211 bytes (authentic ID3v2.4 audio).
  - `khmer-audio.mp3` & `khmer-audio-new-1.mp3`: ABSENT (đúng chuẩn).
  - `public/pieces`: EXISTS, 42 files SVG hợp lệ.
  - Build & Preview: Biên dịch thành công, media load chuẩn xác.

## Realtime Online Gameplay Verification

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-22
- Branch: `online-multiplayer`
- Base Commit: `b8c4b54`
- Mục tiêu: Xác minh một ván cờ Ouk Chaktrang online thực sự chạy end-to-end giữa HAI client độc lập thông qua SERVER AUTHORITATIVE.

### Test Setup & Chi tiết Kiểm thử (`server/test-realtime-gameplay.ts`)

- **Số client**: 2 Socket.IO client độc lập thực sự (`Client A` - socket ID 1, `Client B` - socket ID 2).
- **Create Room**: `Client A` tạo phòng, server sinh mã PIN 6 số (`711224`), trả về `roomId`, gán `color: "w"` và `status: "waiting"`. -> **PASS**
- **Join Room**: `Client B` kết nối và tham gia bằng mã PIN, server kết nạp và kích hoạt trạng thái phòng `ready`. -> **PASS**
- **Initial Board**: Cả `Client A` và `Client B` nhận cùng bàn cờ khởi tạo 64 ô chuẩn luật Ouk Chaktrang với `turn: "w"`. -> **PASS**
- **White Move**: `Client A` (Trắng) gửi nước đi hợp lệ Tốt (40 -> 32). Server kiểm tra tính hợp lệ qua Ouk engine, áp dụng nước đi, cập nhật bàn cờ, chuyển lượt sang Đen (`"b"`), và broadcast `game:moved` cho cả 2 client. -> **PASS**
- **Turn Synchronization**: Lượt đi chuyển chính xác từ `"w"` sang `"b"`, cả hai client đều nhận `turn: "b"`. -> **PASS**
- **Out-of-turn Rejection**: `Client A` cố gửi tiếp nước đi (41 -> 33) khi đang là lượt của Đen. Server từ chối ngay lập tức với mã lỗi `NOT_YOUR_TURN`, không làm ảnh hưởng trạng thái ván cờ. -> **PASS**
- **Illegal Move Rejection**: `Client B` (Đen) cố gửi nước đi nhảy Tốt sai luật (16 -> 40). Server từ chối ngay lập tức với mã lỗi `INVALID_MOVE`. -> **PASS**
- **Black Move**: `Client B` (Đen) gửi nước đi hợp lệ Tốt (16 -> 24). Server xác thực, áp dụng nước đi, chuyển lượt về Trắng (`"w"`), và broadcast `game:moved` cho cả 2 client. -> **PASS**
- **Board Synchronization**: Sau mỗi nước đi, bàn cờ 64 ô của cả 2 client khớp tuyệt đối 100% với trạng thái authoritative của server (`JSON.stringify(boardA) === JSON.stringify(boardB)`). -> **PASS**

### Kết quả Kiểm thử Toàn diện

- **Realtime Online Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 2 Room System Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 88/88 PASSED (100%)
- **Build Result (`npm run build`)**: Thành công 100% (Vite client SPA + esbuild server bundle).

### Files Created / Modified

- Created: `server/test-realtime-gameplay.ts`
- Modified: `docs/ONLINE_DEVELOPMENT_LOG.md`
- Modified: `docs/AI_BRIDGE_HISTORY.md`
- Modified: `docs/AI_BRIDGE.md`

## Stage 4 — End-to-End Verification

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-22
- Branch: `online-multiplayer`
- Base Commit: `a11945d`
- Phạm vi: Xác nhận hệ thống Room + Socket + Client Multiplayer hoạt động end-to-end giữa HAI client độc lập thực tế (kèm third client testing), không dùng mock hay giả lập logic.

### Bài kiểm thử End-to-End (`server/test-e2e-room-client.ts`)

Đã triển khai test suite độc lập mô phỏng đầy đủ chu trình tương tác thực tế qua Socket.IO:

1. **Hai Client Độc Lập Thực Sự**:
   - Khởi tạo 2 kết nối Socket.IO riêng biệt (`Client A` - socket ID 1, `Client B` - socket ID 2) và `Client C` (socket ID 3).
2. **Create Room Flow**:
   - `Client A` gửi `room:create` với tên "Grandmaster Sovann".
   - Server tạo phòng, trả về `roomPin` (6 chữ số ngẫu nhiên cryptographically secure), `roomId` (UUID), gán `color: "w"`, và `status: "waiting"`. -> **PASS**
3. **Join Room Flow**:
   - `Client B` gửi `room:join` kèm đúng `roomPin` và tên "Challenger Dara". -> **PASS**
4. **Color Assignment**:
   - Server gán `Client B` nhận `color: "b"` và gửi kèm thông tin đối thủ `opponent.playerName: "Grandmaster Sovann"`. -> **PASS**
5. **Room Ready Broadcast**:
   - Cả `Client A` và `Client B` nhận sự kiện `room:ready` đồng bộ chứa chính xác thông tin White ("Grandmaster Sovann") và Black ("Challenger Dara"). -> **PASS**
6. **Third Player Protection**:
   - `Client C` gửi `room:join` vào mã PIN đã đủ 2 người. Server từ chối ngay lập tức với mã lỗi `ROOM_FULL` ("Room already has 2 players."). -> **PASS**
7. **Disconnect Event Handling**:
   - `Client B` ngắt kết nối (`disconnect()`). Server phát hiện và broadcast ngay lập tức sự kiện `player:disconnected` (`color: "b"`) cho `Client A`. -> **PASS**

### Kết quả Kiểm thử Tổng thể

- **E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 2 Room System Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 88/88 PASSED (100%)
- **Build Result (`npm run build`)**: Thành công 100% (Vite client SPA + esbuild server bundle).

### Files Created / Modified

- Created: `server/test-e2e-room-client.ts`
- Modified: `docs/ONLINE_DEVELOPMENT_LOG.md`
- Modified: `docs/AI_BRIDGE_HISTORY.md`
- Modified: `docs/AI_BRIDGE.md`

## Stage 4 — Client Multiplayer UI & Socket Connection

### Trạng thái trước khi bắt đầu

- Ngày thực hiện: 2026-08-21
- Branch: online-multiplayer
- Commit trước Stage 4:
  d6faf1bff49111a31e5ac393c36b0523230153ac

### Client Architecture & Separation of Concerns

1. **Client Communication Layer (`src/lib/online-client.ts`)**:
   - Singleton `OnlineClient` quản lý kết nối Socket.IO tới backend (`socket.io-client`).
   - Hỗ trợ auto-reconnect, custom typed event emitter subscription pattern (`on`, `emitInternal`).
   - Tách biệt hoàn toàn giao thức Socket.IO khỏi UI component logic.

2. **Online Game Hook (`src/hooks/useOnlineGame.ts`)**:
   - Quản lý toàn bộ state máy trạng thái của client online:
     - Trạng thái kết nối (`connectionState`: `"disconnected"` | `"connecting"` | `"connected"` | `"error"`).
     - Màn hình (`screen`: `"lobby"` | `"waiting"` | `"ready"` | `"playing"` | `"finished"`).
     - Nhận diện người chơi và đối thủ (`playerName`, `opponentName`, `playerColor`, `roomPin`, `roomId`).
     - **Authoritative Game State từ Server**: `board`, `turn`, `gameStatus`, `countingState`, `gameResult`.
     - Lựa chọn ô cờ (`selected`), gợi ý nước đi hợp lệ (`targets`), hiển thị nước đi vừa đánh (`lastMove`), ô cờ bị chiếu (`checkSquare`).
     - Quân cờ đã bị ăn cho cả 2 bên (`captured: { w: string[], b: string[] }`).
     - Xử lý âm thanh SFX đồng bộ qua `audioManager` theo kết quả thực tế từ server (`move`, `capture`, `check`, `checkmate`, `victory`, `defeat`, `draw`).

3. **Client UI (`src/routes/online.tsx`)**:
   - **Lobby View**: Nhập tên người chơi, Tạo phòng mã PIN 6 số, Nhập PIN tham gia phòng.
   - **Waiting View**: Hiển thị mã PIN lớn, nút sao chép mã PIN kèm hiệu ứng, trạng thái chờ đối thủ tham gia với animation.
   - **Match View**: Tái sử dụng `ChessBoard` component, hiển thị thanh đối thủ (trên) và bạn (dưới), chỉ báo lượt đi trực quan, hiển thị quân cờ đã ăn, thanh đếm Viel Honor Count khi kích hoạt, banner báo Chiếu (Ouk) và Modal Game Over khi trận đấu kết thúc.
   - Hỗ trợ tự động lật bàn cờ (`flipped={playerColor === "b"}`) khi người chơi là bên Đen.

### Bảo toàn tính độc lập của Offline Mode

- Offline Chess Engine (`src/routes/play.tsx`, `src/lib/khmer-chess.ts`) không bị sửa đổi hay ảnh hưởng.
- Toàn bộ assets, sound effects, AI Web Worker, routing và app shell của ứng dụng offline được bảo toàn nguyên vẹn 100%.

### Kết quả Kiểm thử Stage 4 (Automated Test Suite)

Đã tạo và chạy toàn bộ 7 bài kiểm thử tự động trong `server/test-stage4.ts`:

- **TEST 1 — Create Room Flow**: Host tạo phòng nhận PIN 6 chữ số, gán phe Trắng (`"w"`), trạng thái `"waiting"`.
- **TEST 2 — Join Room Flow**: Guest nhập PIN tham gia, nhận phe Đen (`"b"`), cả 2 bên nhận `room:ready` kèm metadata đối thủ.
- **TEST 3 — Authoritative Initial Board**: Cả 2 bên nhận `game:start` với bàn cờ 64 ô đầy đủ, lượt đi ban đầu thuộc về Trắng (`"w"`).
- **TEST 4 — Move Execution & Broadcast**: Host (Trắng) đi nước đi hợp lệ (Tốt 40 -> 32), server cập nhật bàn cờ và broadcast `game:moved` cho cả 2 bên, chuyển lượt sang Đen.
- **TEST 5 — Out-of-turn Move Rejection**: Trắng gửi nước đi khi đang là lượt của Đen bị từ chối chính xác với mã lỗi `NOT_YOUR_TURN`.
- **TEST 6 — Black Valid Move Response**: Guest (Đen) đi nước đi hợp lệ (Tốt 16 -> 24), server xử lý và chuyển lượt lại cho Trắng.
- **TEST 7 — Disconnect Handling & Notification**: Guest ngắt kết nối, Host nhận sự kiện `player:disconnected` ngay lập tức.

### Files Created / Modified

- Created: `src/lib/online-types.ts` (Typed interfaces cho toàn bộ sự kiện Socket.IO giữa Client và Server)
- Created: `src/lib/online-client.ts` (Client abstraction layer cho Socket.IO)
- Created: `src/hooks/useOnlineGame.ts` (Hook máy trạng thái online game)
- Created: `server/test-stage4.ts` (Test suite tự động cho Stage 4)
- Modified: `src/routes/online.tsx` (Giao diện multiplayer hoàn chỉnh)
- Modified: `server/index.ts` (Broadcast `player:disconnected` khi người chơi rời phòng hoặc ngắt kết nối)
- Modified: `package.json` (`socket.io-client` chuyển sang `dependencies`)

## Stage 3 — Server-Authoritative Game Engine

### Trạng thái trước khi bắt đầu

- Ngày thực hiện: 2026-08-21
- Branch: online-multiplayer
- Commit trước Stage 2:
  bb99f9a0832189374242b49f927c2351bfeaecfb

### Room Model & Architecture

- **Room Structure**:
  - `roomId`: UUID v4 định danh phòng
  - `roomPin`: Chuỗi 6 chữ số ngẫu nhiên
  - `createdAt`: Timestamp thời điểm tạo phòng
  - `status`: `"waiting"` | `"ready"` | `"expired"`
  - `players`: `{ w: PlayerSession | null, b: PlayerSession | null }`
  - `cleanupTimer`: NodeJS.Timeout cho TTL cleanup phòng chờ
- **Player Session**:
  - `playerId`: UUID v4 định danh người chơi
  - `playerName`: Tên người chơi (đã được sanitize & validate 1-30 ký tự)
  - `socketId`: ID kết nối Socket.IO
  - `color`: `"w"` (Host - White) | `"b"` (Guest - Black)
  - `joinedAt`: Timestamp thời điểm vào phòng

### Room Lifecycle

1. **Create Room**:
   - Host gửi `room:create` với `playerName`.
   - Server sinh PIN 6 chữ số an toàn và gán host làm Trắng (`"w"`), trạng thái `"waiting"`.
   - Bắt đầu bộ đếm TTL 15 phút (900,000ms) để tự động giải phóng phòng chờ nếu không có người thứ hai.
   - Server gửi phản hồi `room:created` (`roomPin`, `roomId`, `color: "w"`, `status: "waiting"`).
2. **Join Room**:
   - Guest gửi `room:join` với `roomPin` và `playerName`.
   - Server kiểm tra PIN và tính khả dụng của phòng.
   - Hủy bỏ bộ đếm TTL phòng chờ, gán guest làm Đen (`"b"`), cập nhật trạng thái `"ready"`.
   - Gửi `room:joined` cho guest và broadcast `room:ready` cho cả hai người chơi.
3. **Leave & Cleanup**:
   - Khi host rời phòng ở trạng thái `"waiting"`, phòng được đóng và xóa ngay lập tức.
   - Phòng chờ quá 15 phút tự động chuyển thành `"expired"` và được dọn dẹp khỏi bộ nhớ.

### PIN Generation & Security

- Sinh ngẫu nhiên bằng `crypto.randomInt(100000, 1000000)`.
- Xác minh không trùng lặp với bất kỳ phòng đang hoạt động nào.
- Định dạng nghiêm ngặt đúng 6 chữ số (`/^\d{6}$/`).
- Phân bổ phe Trắng/Đen hoàn toàn do Server quyết định (Client không được tự chọn).
- Không cho phép người thứ ba tham gia (`ROOM_FULL`).

### Socket.IO Events & Error Codes

- **Client → Server Events**:
  - `room:create`: `{ playerName: string }`
  - `room:join`: `{ roomPin: string, playerName: string }`
  - `room:leave`
- **Server → Client Events**:
  - `room:created`: `{ roomPin, roomId, color: "w", status: "waiting" }`
  - `room:joined`: `{ roomPin, roomId, color: "b", opponent: { playerName }, status: "ready" }`
  - `room:ready`: `{ roomId, roomPin, white: { playerId, playerName }, black: { playerId, playerName }, status: "ready" }`
  - `room:error`: `{ code: RoomErrorCode, message: string }`
  - `room:left`: `{ status: "left" }`
- **Error Codes**:
  - `ROOM_NOT_FOUND`: PIN không tồn tại hoặc phòng đã hết hạn.
  - `ROOM_FULL`: Phòng đã đủ 2 người chơi.
  - `INVALID_PIN`: Mã PIN sai định dạng (không phải 6 chữ số).
  - `INVALID_PLAYER_NAME`: Tên trống hoặc vượt quá 30 ký tự.
  - `ROOM_NOT_JOINABLE`: Lỗi không thể xử lý phòng.

### Kết quả Kiểm thử Stage 2 (Automated Test Suite)

Đã tạo và chạy toàn bộ 8 bài kiểm thử tự động trong `server/test-stage2.ts`:

- **TEST 1 — Create Room**: Thành công tạo phòng, PIN 6 chữ số, gán phe Trắng (`"w"`), trạng thái `"waiting"`.
- **TEST 2 — Join Room**: Người thứ hai tham gia thành công, gán phe Đen (`"b"`), cả 2 bên nhận sự kiện `room:ready` kèm thông tin đối thủ.
- **TEST 3 — Invalid / Non-existent PIN**: Trả về chính xác `ROOM_NOT_FOUND` và `INVALID_PIN`.
- **TEST 4 — Third Player (ROOM_FULL)**: Người thứ ba bị từ chối chính xác với lỗi `ROOM_FULL`.
- **TEST 5 — Invalid Player Name Validation**: Tên rỗng hoặc quá dài bị từ chối với lỗi `INVALID_PLAYER_NAME`.
- **TEST 6 — PIN Uniqueness**: Tạo 20 phòng liên tiếp, xác nhận 20 mã PIN 6 chữ số hoàn toàn duy nhất, không trùng lặp.
- **TEST 7 — Leave Waiting Room**: Host rời phòng chờ, phòng được đóng và người khác không thể vào (`ROOM_NOT_FOUND`).
- **TEST 8 — Room Cleanup (TTL Expiry)**: Phòng chờ quá hạn TTL tự động bị hủy và giải phóng bộ nhớ.

### Frontend Build & Test Verification

- Frontend applet build verification: Thành công (`Build succeeded - the applet is compiled`).
- Toàn bộ ứng dụng offline, giao diện, audio, engine tests không bị ảnh hưởng.

### Source & Asset Preservation Confirmed (Không Thay Đổi)

- `src/lib/khmer-chess.ts` (Game engine giữ nguyên vẹn).
- `src/routes/play.tsx` (Offline play route giữ nguyên vẹn).
- `src/components/` (Components giữ nguyên vẹn).
- `src/lib/audio/` (Audio manager & synth giữ nguyên vẹn).
- `src/assets/` & `src/assets/khmer-audio-new.mp3` (Assets giữ nguyên vẹn).
- `public/pieces/` (Tất cả bộ cờ giữ nguyên vẹn).
- `src/workers/ai.worker.ts` (AI worker giữ nguyên vẹn).
- `.github/workflows/main.yml` & Android config (Giữ nguyên vẹn).

### Files Created / Modified

- Created: `server/room-types.ts`
- Created: `server/room-manager.ts`
- Created: `server/test-stage2.ts`
- Modified: `server/index.ts` (Tích hợp room events vào Socket.IO server)

### Dependencies Added

- Không thêm dependency mới (Sử dụng `crypto` có sẵn trong Node.js và `socket.io` đã cài từ Stage 1).

### Known Limitations

- Chưa tích hợp engine `khmer-chess.ts` và logic ván đấu.
- Chưa có reconnection/token authentication khi ngắt kết nối giữa ván đấu (sẽ xử lý ở các Stage tiếp theo).

### Next Step

Stage 3 — Server-Authoritative Game Engine.
Stage 3 sẽ tích hợp `src/lib/khmer-chess.ts` vào backend để khởi tạo bàn cờ, xác thực tính hợp lệ của nước đi từ server và quản lý trạng thái ván đấu.

## Stage 1 — Backend Foundation

### Trạng thái trước khi bắt đầu

- Ngày thực hiện: 2026-08-21
- Branch: online-multiplayer
- Commit trước Stage 1:
  f66675d65ffc2beeb6f327d2c13f488d201a5717

### Server Architecture Đã Triển Khai

- Khởi tạo server realtime độc lập sử dụng Node.js `http` module và `socket.io`.
- Thiết lập port mặc định: 3000 (cho phép ghi đè qua biến môi trường `PORT`).
- CORS được cấu hình mở (`*`) cho các kết nối HTTP và WebSockets.
- Endpoint HTTP Health Check: `GET /health` và `GET /api/health` trả về `{"status":"ok"}`.
- Socket.IO connection và disconnect lifecycle logging được triển khai (`connection`, `disconnect`).

### Kết quả Kiểm thử Backend (Test Results)

- **Compilation & Startup**: Server khởi động độc lập và bắt đầu lắng nghe cổng thành công.
- **Health Check Endpoint**:
  - Request: `GET http://127.0.0.1:3999/health`
  - Response: `HTTP 200 OK` với body: `{"status":"ok"}`
- **Socket.IO Connection Test**:
  - Client socket kết nối thành công (`transports: ["websocket"]`).
  - Ghi nhận `socket.id` khi kết nối.
  - Client disconnect thành công và server ghi nhận lý do disconnect sạch sẽ.

### Frontend Build & Test Verification

- Frontend applet build verification: Thành công (`Build succeeded`).
- Toàn bộ ứng dụng offline, giao diện, audio, engine tests không bị ảnh hưởng.

### Source & Asset Preservation Confirmed (Không Thay Đổi)

- `src/lib/khmer-chess.ts` (Game engine giữ nguyên vẹn).
- `src/routes/play.tsx` (Offline play route giữ nguyên vẹn).
- `src/components/` (Components giữ nguyên vẹn).
- `src/lib/audio/` (Audio manager & synth giữ nguyên vẹn).
- `src/assets/` & `src/assets/khmer-audio-new.mp3` (Assets giữ nguyên vẹn).
- `public/pieces/` (Tất cả bộ cờ giữ nguyên vẹn).
- `.github/workflows/main.yml` & Android config (Giữ nguyên vẹn).

### Files Added

- `server/index.ts` (Realtime server foundation).
- `server/test-server.ts` (Automated verification test script).

### Dependencies Added

- `socket.io` (^4.8.3): Server WebSocket framework.
- `socket.io-client` (^4.8.3, devDependency): Client socket thư viện cho kiểm thử kết nối.

### Các vấn đề còn tồn tại (Known Issues)

- Không có vấn đề hay lỗi phát sinh.

### Next Step

Stage 2 — Room System.
Stage 2 sẽ thiết kế và triển khai hệ thống quản lý phòng (Create Room, 6-digit PIN, Join Room, Player Side Assignment) trên nền tảng Socket.IO đã xây dựng.

## Stage 0 — Baseline & Branch

### Trạng thái trước khi bắt đầu

- Branch: main
- Working tree: clean
- Main commit:
  f66675d65ffc2beeb6f327d2c13f488d201a5717
- Commit message:
  baseline: stable offline Ouk Chaktrang application

### Kết quả

Đã tạo branch:

online-multiplayer

Commit hiện tại của branch:

f66675d65ffc2beeb6f327d2c13f488d201a5717

Branch online-multiplayer bắt đầu chính xác từ cùng commit với main.

### Source Integrity

- Không có source file nào bị sửa.
- Không có file nào bị thêm.
- Không có file nào bị xóa.
- Không có file nào bị rename.

### Dependency Integrity

- package.json không thay đổi.
- package-lock.json không thay đổi.
- Không thêm dependency.

### Build Verification

Build đã thành công.

### Branch Policy

main:

- Stable offline baseline.
- Không dùng để phát triển multiplayer trực tiếp.

online-multiplayer:

- Branch dành cho toàn bộ phát triển online multiplayer.

## Architecture Decisions Confirmed

- Server phải là authoritative cho multiplayer game state.
- src/lib/khmer-chess.ts là game engine dùng chung.
- Engine đã được xác nhận có thể chạy trực tiếp trong Node.js.
- Backend dự kiến dùng Node.js + Socket.IO.
- MVP dùng Create Room + 6-digit PIN + Join Room.
- Guest identity dùng playerId + playerToken.
- Server authoritative clock.
- Multiplayer chưa được triển khai ở Stage 0.

## Files Added

- docs/ONLINE_DEVELOPMENT_LOG.md

## Files Modified

Không có source file nào được sửa.

## Dependencies Added

Không có.

## Next Step

Stage 1 — Backend Foundation.

Stage 1 sẽ chỉ dựng server foundation và kiểm tra khả năng chạy Node.js + Socket.IO.
Chưa triển khai room gameplay hoặc thay đổi offline game.

## Stage 10 — Android APK & Mobile WebView Verification

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-23
- Branch: `online-multiplayer`
- Base Commit: `a948f2f`
- Mục tiêu: Củng cố và xác minh toàn diện khả năng đóng gói Android APK và trải nghiệm di động trên WebView.

### Chi tiết Thực hiện & Kiểm thử (`server/test-stage10-mobile.ts`)

1. **APK / Bundle Structure**: Cấu trúc web bundle tương thích tuyệt đối với packaging của Capacitor 7 và CI workflow. -> **PASS**
2. **Viewport & Meta**: `index.html` cấu hình `viewport-fit=cover`, `user-scalable=no`, `width=device-width` chống phóng to ngoài ý muốn và tối ưu safe-area tai thỏ. -> **PASS**
3. **Hash Navigation**: `createHashHistory()` bảo đảm routing `#/play` và `#/online` không gây lỗi 404 trên Android WebView khi reload hoặc mở link. -> **PASS**
4. **Binary & SVG Assets**: Kiểm tra toàn bộ 48 assets (mascot.png, angkor-hero.jpg, khmer-audio-new.mp3, 42 piece SVGs) đạt 100% tính toàn vẹn nhị phân. -> **PASS**
5. **Web Audio Unlock & Lifecycle**: `AudioManager` hỗ trợ unlock qua user interaction (`pointerdown`, `touchstart`, `keydown`) và tự động resume AudioContext khi app trở lại foreground qua `visibilitychange`. -> **PASS**
6. **Offline AI & Web Worker**: Engine cờ Khmer và minimax AI Web Worker chạy hoàn toàn offline không cần internet. -> **PASS**
7. **External Socket Endpoint Resolution**: `OnlineClient` giải quyết endpoint thông qua `VITE_ONLINE_SERVER_URL` cho môi trường APK (nơi origin là `https://localhost`), tự động fallback về `window.location.origin` trên trình duyệt web. -> **PASS**
8. **Realtime Protocols on Mobile**: Toàn bộ luồng Create Room (6-digit PIN), Join PIN, Quick Match (Stage 9 Matchmaking), Ready Check, và Rematch hoạt động chính xác qua Socket.IO client. -> **PASS**
9. **Android Background/Foreground**: Bổ sung `visibilitychange` listeners quản lý tự động reconnect socket và audio state. -> **PASS**
10. **Client Token & Secret Audit**: Mã nguồn client (`src/`) không chứa bất kỳ hardcoded secret hay API key nào. -> **PASS**

### Kết quả Kiểm thử Toàn diện

- **Stage 10 Mobile Acceptance Test (`server/test-stage10-mobile.ts`)**: 24/24 PASSED (100%)
- **Stage 9 Matchmaking Test (`server/test-stage9-matchmaking.ts`)**: 12/12 scenarios, 28/28 assertions PASSED (100%)
- **Stage 8 Room Lifecycle Test (`server/test-stage8-room-lifecycle.ts`)**: 20/20 scenarios, 39/39 assertions PASSED (100%)
- **Stage 7 Ready Check & Rematch Test (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
- **Stage 6 Reconnection Test (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Realtime Online Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Stage 4 E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room Creation Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Asset Integrity Checks (`scripts/check-assets.ts`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Application Build (`npm run build`)**: Thành công 100%.

## Stage 10 Final Blocker — Railway Deployment Preparation & Production tsx Runtime Fix

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-23
- Branch: `online-multiplayer`
- Mục tiêu: Bổ sung package `tsx` vào production dependencies trong `package.json` để runtime Railway Railpack thực thi lệnh `npm run server:start` không gặp lỗi `sh: 1: tsx: not found`.

### Chi tiết Thực hiện

1. **Production Dependencies (`package.json`)**:
   - Bổ sung `"tsx": "^4.23.12"` vào mục `"dependencies"` (thay vì chỉ dựa vào dev/local tooling).
   - Đồng bộ `package-lock.json` và `bun.lock`.
   - Xác nhận executable `tsx` được resolve (`tsx v4.23.12`) và `server/start.ts` khởi chạy bình thường.
2. **Cấu hình Railway (`railway.json`)**:
   - `build.builder`: `"RAILPACK"`.
   - `startCommand`: `"npm run server:start"`.
   - `healthcheckPath`: `"/health"`.
3. **PORT & Health Check**:
   - Lắng nghe trên `process.env.PORT` động do Railway cấp, bind tới `0.0.0.0`.
   - Healthcheck endpoint: `GET /health` (`status: ok`).
4. **CORS & Client URL**:
   - `CORS_ORIGIN`: Mặc định `*` phục vụ testing.
   - `VITE_ONLINE_SERVER_URL` chưa được gán giá trị giả. Chờ kết quả deploy thực tế từ Railway.

### Kết quả Kiểm thử Toàn diện

- **Standalone Server Startup & /health Verification**: PASSED (HTTP 200 `{"status":"ok"}`)
- **Stage 10 Mobile Acceptance Test (`server/test-stage10-mobile.ts`)**: 24/24 PASSED (100%)
- **Stage 9 Matchmaking Test (`server/test-stage9-matchmaking.ts`)**: 12/12 scenarios, 28/28 assertions PASSED (100%)
- **Stage 8 Room Lifecycle Test (`server/test-stage8-room-lifecycle.ts`)**: 20/20 scenarios, 39/39 assertions PASSED (100%)
- **Stage 7 Ready Check & Rematch Test (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
- **Stage 6 Reconnection Test (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Realtime Online Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Stage 4 E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room Creation Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Asset Integrity Checks (`scripts/check-assets.ts`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Application Build (`npm run build`)**: Thành công 100%.

## Stage 11 — Final Acceptance & End-to-End Multi-Device Polish

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-23
- Branch: `online-multiplayer`
- Starting Commit: `b365809d342527ef3d24f927af7cda2feb3fc0ff`
- Production Railway URL: `https://ouk-khmer-online-production.up.railway.app`
- Production Port: `8080` (dynamic ingress)
- `VITE_ONLINE_SERVER_URL`: `https://ouk-khmer-online-production.up.railway.app`
- Target Branch: `origin/online-multiplayer`
- Main Branch Status: `3afaa5fa046d16537c97d6385b01c286fdc22696` (UNTOUCHED & PRESERVED)

### Chi tiết Thực hiện & Kiểm thử Trực tiếp trên Production Railway

1. **Production Healthcheck**: `GET /health` trả về HTTP 200 `{"status":"ok"}` kèm CORS header `access-control-allow-origin: *`. -> **PASS**
2. **Production Socket.IO Polling & WebSocket Upgrade**: Handshake polling thành công, nhận SID và upgrade sang WebSocket ổn định trên Railway edge. -> **PASS**
3. **Web Production Client**: Cấu hình `VITE_ONLINE_SERVER_URL` nạp trực tiếp endpoint Railway qua `.env.production` (loại bỏ hoàn toàn localhost/dev-server). -> **PASS**
4. **Android APK Production Client**: Cấu hình `VITE_ONLINE_SERVER_URL` nạp trực tiếp endpoint Railway, loại bỏ fallback về `localhost:3000`. -> **PASS**
5. **Two-Client / Multi-Device E2E (`server/test-stage11-e2e.ts`)**:
   - **E2E-1 & E2E-2 (Dual Client Connect)**: Client A (Web) và Client B (Android) kết nối đồng thời tới Live Production Backend. -> **PASS**
   - **E2E-3 & E2E-4 (Create Room & Join via 6-digit PIN)**: Client A tạo phòng nhận mã PIN 6 số (gán quân Trắng), Client B tham gia bằng PIN (gán quân Đen) và cả hai nhận thông tin đối thủ. -> **PASS**
   - **E2E-5 (Dual Ready Check & Match Initialization)**: Cả hai client xác nhận sẵn sàng và nhận bàn cờ 64 ô đồng bộ, lượt đi đầu tiên là Trắng (`w`). -> **PASS**
   - **E2E-6 & E2E-7 (Server-Authoritative Move Execution & Synchronization)**: Client A đi nước mở màn (40 -> 32), Client B đi nước đáp trả (16 -> 24); server xác thực luật Ouk Chaktrang và phát sóng đồng bộ trạng thái bàn cờ. -> **PASS**
   - **E2E-8 (Server Rejection of Invalid / Out-of-Turn Moves)**: Client B cố tình đi sai lượt, server từ chối với mã lỗi `NOT_YOUR_TURN` mà không làm sai lệch trạng thái trận đấu. -> **PASS**
   - **E2E-9 (Graceful Disconnection Handling)**: Ngắt kết nối socket của Client B, phòng chơi bước vào grace period an toàn. -> **PASS**
   - **E2E-10 (Session Reconnection & Authoritative State Recovery)**: Client B kết nối lại với `playerToken` và `matchId`, khôi phục toàn vẹn trạng thái ván đấu đang diễn ra (`match:sync_state`). -> **PASS**
   - **E2E-11 (Stage 9 Matchmaking Queue Integration)**: 2 client độc lập gia nhập hàng chờ `queue:join` và được tự động ghép đôi vào một phòng thi đấu mới. -> **PASS**
   - **E2E-12 (Offline Engine & Cultural Assets Integrity)**: Chế độ chơi Offline (với máy / 2 người cục bộ) và toàn bộ 48 assets nhị phân/SVG được bảo toàn nguyên vẹn 100%. -> **PASS**

### Kết quả Kiểm thử Toàn diện & Regression

- **Stage 11 Live Multi-Device Acceptance Suite (`server/test-stage11-e2e.ts`)**: 12/12 scenarios PASSED (100%)
- **Stage 10 Mobile Acceptance Suite (`server/test-stage10-mobile.ts`)**: 24/24 PASSED (100%)
- **Stage 9 Matchmaking Test (`server/test-stage9-matchmaking.ts`)**: 12/12 scenarios, 28/28 assertions PASSED (100%)
- **Stage 8 Room Lifecycle Test (`server/test-stage8-room-lifecycle.ts`)**: 20/20 scenarios, 39/39 assertions PASSED (100%)
- **Stage 7 Ready Check & Rematch Test (`server/test-stage7-lifecycle.ts`)**: 12/12 PASSED (100%)
- **Stage 6 Reconnection Test (`server/test-reconnection.ts`)**: 6/6 PASSED (100%)
- **Realtime Online Gameplay Test (`server/test-realtime-gameplay.ts`)**: 6/6 PASSED (100%)
- **Stage 4 Multiplayer Test (`server/test-stage4.ts`)**: 7/7 PASSED (100%)
- **Stage 4 E2E Room & Client Test (`server/test-e2e-room-client.ts`)**: 5/5 PASSED (100%)
- **Stage 3 Game Engine Test (`server/test-stage3.ts`)**: 10/10 PASSED (100%)
- **Stage 2 Room Creation Test (`server/test-stage2.ts`)**: 8/8 PASSED (100%)
- **Asset Integrity Checks (`scripts/check-assets.ts`)**: 48/48 PASSED (100%)
- **Offline Chess Engine Tests (`src/lib/khmer-chess.test.ts`)**: 123/123 PASSED (100%)
- **Zero Secrets / Tokens Audit**: PASSED (100% clean)
- **Production Web & Server Bundle Build (`npm run build`)**: Thành công 100% (Vite Client + esbuild `dist/server.cjs`).

## Session Update — GitHub Auth & Full Core Verification

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-25
- Branch: `online-multiplayer`
- Remote: `https://github.com/machxanht/Ouk-Khmer-Online.git`
- GitHub User: `machxanht`
- Target Branch: `origin/online-multiplayer`
- Main Branch Status: UNTOUCHED & PRESERVED (Tuân thủ nghiêm ngặt không can thiệp branch main)

### Chi tiết Hoạt động & Kết quả Kiểm thử

1. **GitHub Device Authentication**:
   - Hoàn tất cấp quyền GitHub Device Auth cho tài khoản `machxanht`.
   - Cấu hình tự động `gh auth setup-git` và xác minh remote `origin` trỏ chuẩn xác về `https://github.com/machxanht/Ouk-Khmer-Online.git`.
2. **Multiplayer Core Online Lifecycle Verification (`scripts/test-multiplayer-core.ts`)**:
   - TEST 1: Khởi tạo RoomManager thành công. -> **PASS**
   - TEST 2: Host tạo phòng nhận PIN 6 số, gán quân Trắng (`w`), trạng thái `waiting`. -> **PASS**
   - TEST 3: Guest tham gia bằng PIN 6 số, gán quân Đen (`b`), chuyển trạng thái `ready_check`. -> **PASS**
   - TEST 4: Dual Ready Check xác nhận cả 2 người chơi sẵn sàng, ván đấu chuyển sang `playing`, lượt đầu tiên thuộc về Trắng. -> **PASS**
   - TEST 5: Authoritative server engine kiểm tra nước đi mở màn hợp lệ của Trắng, cập nhật bàn cờ và chuyển lượt sang Đen (`b`). -> **PASS**
   - Kết quả: **5/5 tests PASSED (100%)**.
3. **Comprehensive Engine & Audio Suite (`src/lib/khmer-chess.test.ts`)**:
   - 123/123 assertions PASSED (100% Ouk Folk/International rules, BGM, Cultural Assets, Mascot, Web Worker singleton). -> **PASS**
4. **Production Build (`compile_applet` / `npm run build`)**:
   - Toàn bộ ứng dụng build thành công sạch sẽ. -> **PASS**

### Implementation Changes Applied (Online Core Rebuild)

- **`src/routes/online.tsx`**: Chuyển chế độ mặc định từ `static` isolation sang `full` live multiplayer game (`FullLiveOnlineView`), kết nối trọn vẹn hook `useOnlineGame` với authoritative server.
- **`server/room-manager.ts`**: Tích hợp các hàm snapshot chuẩn tắc `getCanonicalRoomState` và `getCanonicalGameState` phục vụ kiểm tra và đồng bộ trạng thái phòng/trận đấu.
- **`scripts/test-multiplayer-core.ts`**: Script kiểm thử trực tiếp 5 bước Online Core Lifecycle.

## Stage 22 — Production Hardening + Desync / Concurrency / Soak QA

### Thông tin Checkpoint

- Ngày thực hiện: 2026-08-29
- Branch: `online-multiplayer`
- Base Commit: `70ea0b885b31d8a493d09c1ef547681e71578ccb`
- Phạm vi: Production Hardening, Audit và Stress QA toàn diện cho hệ thống Online Multiplayer: State Desync, Concurrency/Race Conditions, Socket & Room Lifecycles, Server Error Recovery, Client Authority & Security, Memory Leak Prevention, và Automated Soak Testing.

### Các vấn đề phát hiện & xử lý:

1. **Rematch Session Token Fix (`server/index.ts`)**: Sửa lỗi tham chiếu `newPlayerW`/`newPlayerB` thành `playerW`/`playerB` khi khởi tạo lại session token trong rematch.
2. **Room & Memory Leak Eviction (`server/room-manager.ts`)**: Cải tiến logic thu hồi bộ nhớ cho phòng đã kết thúc (`finished`) khi cả hai người chơi rời phòng hoặc ngắt kết nối. Thêm `cleanupStaleRooms` và các phương thức kiểm tra số lượng phòng, PIN, socket map.
3. **Multi-Move Desync Parity (`server/test-stage22-hardening.ts`)**: Kiểm tra đồng bộ tuyệt đối 10 nước đi liên tiếp giữa 2 client và authoritative server engine.
4. **Concurrency & Race Conditions**: Kiểm tra và bảo vệ chống gửi nước đi đồng thời (`NOT_YOUR_TURN`), chặn đi cờ sai lượt, bảo đảm tính idempotent cho yêu cầu hòa/đấu lại, chặn nước đi sau khi trận đã kết thúc (`GAME_ALREADY_FINISHED`).
5. **Session Reconnection**: Kiểm tra phục hồi trạng thái ván đấu khi ngắt kết nối/bật lại app, bảo vệ chống socket cũ gửi lệnh giả mạo (`NOT_IN_ROOM`), từ chối kết nối lại vào phòng đã kết thúc.
6. **Payload Sanitization & Authority**: Kiểm tra dữ liệu nước đi không hợp lệ (NaN, out-of-bounds, string), PIN không tồn tại/trống, tin nhắn chat quá dài (>200 ký tự). Chặn hoàn toàn việc người chơi di chuyển quân cờ của đối thủ.
7. **Automated Soak Testing**: Chạy tự động 10 chu trình tạo phòng - ghép trận - đánh cờ - chat - kết thúc trận đấu, xác nhận bộ nhớ sạch sẽ 100% không còn phòng rác hoặc timer rác.

### Kết quả Kiểm thử Tổng thể:

- **Stage 22 QA & Soak Suite (`server/test-stage22-hardening.ts`)**: 30/30 PASSED (100%)
- **Stage 20/21 Integration Suite (`server/test-online.ts`)**: 27/27 PASSED (100%)
- **Multiplayer Core Suite (`scripts/test-multiplayer-core.ts`)**: 80/80 PASSED (100%)
- **Asset Integrity Checks (`npm run check:assets`)**: 48/48 PASSED (100%)
- **Production Bundle Build (`compile_applet` / `npm run build`)**: Thành công 100%

## Important Rules

- Không phá main.
- Không sửa offline gameplay nếu không cần thiết.
- Không sửa audio/assets hiện tại.
- Không sửa Android build pipeline nếu chưa được yêu cầu.
- Không rewrite src/lib/khmer-chess.ts.
- Mọi stage phải được ghi vào file này trước khi kết thúc phiên làm việc.
- Mỗi phiên mới phải đọc file này trước khi thực hiện công việc.
- Không tự ý làm vượt qua stage đang được giao.
