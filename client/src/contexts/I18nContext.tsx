import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

export type Locale = "en" | "zh-TW";

// ─── Translation keys ───────────────────────────────────────────
const translations = {
  en: {
    // Navbar
    "nav.rides": "Rides",
    "nav.myRides": "My Rides",
    "nav.admin": "Admin",
    "nav.signIn": "Sign In",
    "nav.signOut": "Sign Out",
    "nav.manageEvents": "Manage Events",
    "nav.carpoolBoard": "Carpool Board",

    // Hero
    "hero.subtitle": "WaveNova Beach Cleanup",
    "hero.title1": "Share the ride,",
    "hero.title2": "save the shore",
    "hero.description": "Connect with fellow volunteers heading to our monthly beach cleanup. Offer a ride or find one — together we reduce emissions and make a bigger impact.",
    "hero.activeRides": "active rides",
    "hero.passengersJoined": "passengers joined",
    "hero.fewerCars": "Fewer cars, cleaner coasts",

    // Events
    "events.upcoming": "Upcoming Events",
    "events.upcomingDesc": "Beach cleanup events with carpool rides available",
    "events.noUpcoming": "No upcoming events scheduled yet. Check back soon!",
    "events.ridesAvailable": "rides available",
    "events.rideAvailable": "ride available",
    "events.ridesOffered": "rides offered",
    "events.rideOffered": "ride offered",
    "events.backToEvents": "Back to events",
    "events.availableRides": "Available Rides",
    "events.availableRidesDesc": "Rides heading to this cleanup event",
    "events.noRidesYet": "No rides yet for this event",
    "events.noRidesDesc": "Be the first to offer a ride to this beach cleanup!",
    "events.noRidesDescSignin": " Sign in to get started.",
    "events.notFound": "Event not found",

    // All Rides
    "rides.allAvailable": "All Available Rides",
    "rides.allAvailableDesc": "Browse all rides to upcoming beach cleanups",
    "rides.noRides": "No rides yet",
    "rides.noRidesDesc": "Be the first to offer a ride to the next beach cleanup!",
    "rides.noRidesDescSignin": " Sign in to get started.",
    "rides.backToRides": "Back to rides",
    "rides.rideNotFound": "Ride not found",
    "rides.rideNotFoundDesc": "This ride may have been cancelled or removed.",

    // Ride Card
    "ride.yourRide": "Your Ride",
    "ride.chatAvailable": "Chat available",
    "ride.past": "Past",
    "ride.full": "Full",
    "ride.seatsLeft": "seats left",
    "ride.seatLeft": "seat left",
    "ride.passengers": "passengers",
    "ride.noSeats": "No Seats Available",
    "ride.noSeatsTooltip": "This ride is full. Check back later!",
    "ride.signInToJoin": "Sign in to Join",
    "ride.joinRide": "Join Ride",
    "ride.joinThisRide": "Join This Ride",
    "ride.leaveRide": "Leave Ride",
    "ride.joinedSuccess": "You've joined this ride!",
    "ride.leftSuccess": "You've left this ride.",
    "ride.joinFailed": "Failed to join ride",
    "ride.leaveFailed": "Failed to leave ride",

    // Ride Detail
    "rideDetail.driver": "Driver",
    "rideDetail.departure": "Departure",
    "rideDetail.dateTime": "Date & Time",
    "rideDetail.seats": "Seats",
    "rideDetail.filled": "filled",
    "rideDetail.passengers": "Passengers",
    "rideDetail.joinChat": "Join this ride to access the group chat and coordinate with the driver and other passengers.",
    "rideDetail.joined": "Joined",
    "rideDetail.forEvent": "For Event",
    "rideDetail.cancelled": "Cancelled",

    // Create Ride
    "createRide.title": "Offer a Ride",
    "createRide.description": "Share your ride to a beach cleanup event. Select the event and fill in the details below.",
    "createRide.selectEvent": "Select Cleanup Event",
    "createRide.selectEventPlaceholder": "Choose an event...",
    "createRide.noEvents": "No upcoming events available",
    "createRide.departureLocation": "Departure Location",
    "createRide.departureLocationPlaceholder": "e.g. Downtown Library Parking Lot",
    "createRide.date": "Date",
    "createRide.time": "Time",
    "createRide.availableSeats": "Available Seats",
    "createRide.notes": "Notes",
    "createRide.notesOptional": "(optional)",
    "createRide.notesPlaceholder": "e.g. Meeting at the north entrance, look for the blue SUV",
    "createRide.cancel": "Cancel",
    "createRide.creating": "Creating...",
    "createRide.create": "Create Ride",
    "createRide.success": "Ride created successfully! Passengers can now join your ride.",
    "createRide.failed": "Failed to create ride",
    "createRide.errorLocation": "Please enter a departure location",
    "createRide.errorDateTime": "Please select a departure date and time",
    "createRide.errorFuture": "Departure time must be in the future",
    "createRide.errorSeats": "Seats must be between 1 and 20",
    "createRide.errorEvent": "Please select a cleanup event",
    "createRide.errorTimeAfterEvent": "Departure time must be before the event starts",
    "createRide.eventStarts": "Event starts",
    "createRide.pickOnMap": "Pick on map",
    "createRide.searchLocation": "Search for a location...",
    "createRide.mapHint": "Click on the map to set pickup location, or drag the pin to adjust.",
    "createRide.shareTitle": "Ride Created!",
    "createRide.shareDesc": "Share this ride with others so they can join.",
    "createRide.copyLink": "Copy Link",
    "createRide.linkCopied": "Link copied to clipboard!",
    "createRide.shareOnTwitter": "Share on X",
    "createRide.shareOnFacebook": "Share on Facebook",
    "createRide.shareOnLine": "Share on LINE",
    "createRide.shareText": "Join my ride to the beach cleanup! 🌊",
    "createRide.done": "Done",

    // Cover Image
    "admin.coverImage": "Cover Image",
    "admin.uploadCover": "Upload Cover",
    "admin.removeCover": "Remove",
    "admin.coverUploading": "Uploading...",
    "admin.coverUploaded": "Cover image uploaded!",
    "admin.coverUploadFailed": "Failed to upload cover image",

    // Map
    "map.viewPickup": "View pickup location",
    "map.pickupLocation": "Pickup Location",

    // Profile
    "profile.myRides": "My Rides",
    "profile.joined": "Joined",
    "profile.driving": "My Rides",
    "profile.passenger": "Joined",
    "profile.active": "Active",
    "profile.cancelled": "Cancelled",
    "profile.confirmed": "Confirmed",
    "profile.noRidesOffered": "No rides offered yet",
    "profile.noRidesOfferedDesc": "Offer a ride to help fellow volunteers get to the beach cleanup!",
    "profile.noRidesJoined": "No rides joined yet",
    "profile.noRidesJoinedDesc": "Browse available rides on the home page and join one!",
    "profile.cancelRide": "Cancel this ride?",
    "profile.cancelRideDesc": "This will notify all passengers that the ride has been cancelled. This action cannot be undone.",
    "profile.keepRide": "Keep Ride",
    "profile.cancelRideBtn": "Cancel Ride",
    "profile.rideCancelled": "Ride cancelled successfully",
    "profile.cancelFailed": "Failed to cancel ride",
    "profile.leftRide": "You've left the ride",
    "profile.leaveFailed": "Failed to leave ride",

    // Admin Events
    "admin.panel": "Admin Panel",
    "admin.manageEvents": "Manage Cleanup Events",
    "admin.manageEventsDesc": "Create and manage beach cleanup events. Drivers can offer rides to each event.",
    "admin.createEvent": "Create Event",
    "admin.createEventTitle": "Create Cleanup Event",
    "admin.createEventDesc": "Create a new beach cleanup event. Drivers can then offer rides to this event.",
    "admin.eventTitle": "Event Title",
    "admin.eventTitlePlaceholder": "e.g. March Beach Cleanup at Malibu",
    "admin.beachLocation": "Beach / Location",
    "admin.beachLocationPlaceholder": "e.g. Malibu Beach, CA",
    "admin.date": "Date",
    "admin.startTime": "Start Time",
    "admin.description": "Description",
    "admin.descriptionOptional": "(optional)",
    "admin.descriptionPlaceholder": "Describe the cleanup event, what to bring, etc.",
    "admin.cancel": "Cancel",
    "admin.creating": "Creating...",
    "admin.createEventBtn": "Create Event",
    "admin.editEvent": "Edit Event",
    "admin.title": "Title",
    "admin.location": "Location",
    "admin.status": "Status",
    "admin.statusUpcoming": "Upcoming",
    "admin.statusActive": "Active",
    "admin.statusCompleted": "Completed",
    "admin.statusCancelled": "Cancelled",
    "admin.saving": "Saving...",
    "admin.saveChanges": "Save Changes",
    "admin.cancelEvent": "Cancel this event?",
    "admin.cancelEventDesc": "This will cancel the event and automatically cancel all active rides. Ride history will be preserved. This cannot be undone.",
    "admin.cancelEventBtn": "Cancel Event",
    "admin.keepEventOpen": "Keep Event Open",
    "admin.eventCancelled": "Event cancelled successfully.",
    "admin.eventCancelFailed": "Failed to cancel event.",
    "admin.deleteEvent": "Delete this event?",
    "admin.deleteEventDesc": "This will permanently delete the event. Events with linked rides cannot be deleted.",
    "admin.keepEvent": "Keep Event",
    "admin.deleteEventBtn": "Delete Event",
    "admin.noEvents": "No events yet",
    "admin.noEventsDesc": "Create your first beach cleanup event to get started.",
    "admin.eventCreated": "Event created successfully!",
    "admin.eventCreateFailed": "Failed to create event",
    "admin.eventUpdated": "Event updated!",
    "admin.eventUpdateFailed": "Failed to update event",
    "admin.eventDeleted": "Event deleted",
    "admin.eventDeleteFailed": "Failed to delete event",
    "admin.accessRequired": "Admin Access Required",
    "admin.accessRequiredDesc": "You need admin privileges to manage events.",

    // Chat
    "chat.title": "Ride Chat",
    "chat.messages": "messages",
    "chat.noMessages": "No messages yet",
    "chat.startConversation": "Start the conversation to coordinate your ride!",
    "chat.placeholder": "Type a message...",
    "chat.sendFailed": "Failed to send message",
    "chat.today": "Today",
    "chat.yesterday": "Yesterday",

    // Event status (reusable)
    "event.statusUpcoming": "Upcoming",
    "event.statusActive": "Active",
    "event.statusCompleted": "Completed",
    "event.statusCancelled": "Cancelled",

    // Home page
    "home.subtitle": "WaveNova Beach Cleanup",
    "home.titlePart1": "Share the ride,",
    "home.titlePart2": "save the shore",
    "home.description": "Connect with fellow volunteers heading to our monthly beach cleanup. Offer a ride or find one — together we reduce emissions and make a bigger impact.",
    "home.activeRides": "active rides",
    "home.passengersJoined": "passengers joined",
    "home.fewerCars": "Fewer cars, cleaner coasts",
    "home.upcomingEvents": "Upcoming Events",
    "home.upcomingEventsDesc": "Beach cleanup events with carpool rides available",
    "home.noEvents": "No upcoming events scheduled yet. Check back soon!",
    "home.rideAvailable": "ride available",
    "home.ridesAvailable": "rides available",
    "home.allRides": "All Available Rides",
    "home.allRidesDesc": "Browse all rides to upcoming beach cleanups",
    "home.noRidesTitle": "No rides yet",
    "home.noRidesDesc": "Be the first to offer a ride to the next beach cleanup!",
    "home.signInToStart": "Sign in to get started.",
    "home.footerTagline": "Reducing emissions, one ride at a time.",

    // Footer
    "footer.tagline": "Reducing emissions, one ride at a time.",

    // 404
    "notFound.title": "Page Not Found",
    "notFound.description": "This page seems to have drifted out to sea. Let's get you back on course.",
    "notFound.backHome": "Back to Shore",

    // Luma Verification
    "luma.verifiedAttendee": "Verified Attendee",
    "luma.verifiedTooltip": "This driver is a verified attendee on the Luma event page",
    "luma.unverified": "Unverified",
    "luma.unverifiedTooltip": "This driver could not be verified as a Luma event attendee",
    "admin.lumaEventUrl": "Luma Event URL",
    "admin.lumaEventUrlPlaceholder": "e.g. https://lu.ma/beach-cleanup-march",
    "admin.lumaEventUrlHint": "Link a Luma event to verify drivers are registered attendees",
    // Luma block screen
    "luma.notRegisteredTitle": "Luma Registration Required",
    "luma.notRegisteredDesc": "To offer a ride for this event, you must be a registered attendee on the Luma event page.",
    "luma.notRegisteredReason": "Your email is not on the guest list",
    "luma.notRegisteredHint": "Only volunteers registered on Luma can offer rides, ensuring safety and coordination.",
    "luma.notRegisteredSteps": "How to get verified:",
    "luma.step1": "Click the button below to open the Luma event page",
    "luma.step2": "Register using the same email you used to sign in here",
    "luma.step3": "Come back and try offering a ride again",
    "luma.verifiedBadgePreview": "Once registered, your ride card will show a \"Verified Attendee\" badge",
    "luma.registerOnLuma": "Register on Luma",
    "luma.tryAgain": "Try Again",
    "luma.registrationRequired": "Offering a ride requires Luma registration.",
    "luma.registerHere": "Register here",
    "luma.passengerNotRegistered": "Luma Registration Required",
    "luma.passengerNotRegisteredDesc": "You must be a registered attendee on the Luma event page to join this ride. Click \"Register on Luma\" to sign up.",

    // Common
    "common.at": "at",
    "common.user": "User",
    "common.driver": "Driver",
    "common.passenger": "Passenger",
    "common.loading": "Loading...",
  },
  "zh-TW": {
    // Navbar
    "nav.rides": "共乘",
    "nav.myRides": "我的行程",
    "nav.admin": "管理",
    "nav.signIn": "登入",
    "nav.signOut": "登出",
    "nav.manageEvents": "管理活動",
    "nav.carpoolBoard": "共乘看板",

    // Hero
    "hero.subtitle": "WaveNova 淨灘活動",
    "hero.title1": "共享車程，",
    "hero.title2": "守護海岸",
    "hero.description": "與志工夥伴一起前往每月淨灘活動。提供或尋找共乘——一起減少碳排放，創造更大的影響力。",
    "hero.activeRides": "進行中的行程",
    "hero.passengersJoined": "位乘客已加入",
    "hero.fewerCars": "更少車輛，更潔淨的海岸",

    // Events
    "events.upcoming": "即將舉辦的活動",
    "events.upcomingDesc": "提供共乘的淨灘活動",
    "events.noUpcoming": "目前沒有即將舉辦的活動，請稍後再查看！",
    "events.ridesAvailable": "個共乘可用",
    "events.rideAvailable": "個共乘可用",
    "events.ridesOffered": "個共乘已提供",
    "events.rideOffered": "個共乘已提供",
    "events.backToEvents": "返回活動列表",
    "events.availableRides": "可用共乘",
    "events.availableRidesDesc": "前往此淨灘活動的共乘行程",
    "events.noRidesYet": "此活動尚無共乘",
    "events.noRidesDesc": "成為第一個提供共乘的人！",
    "events.noRidesDescSignin": "請先登入以開始使用。",
    "events.notFound": "找不到活動",

    // All Rides
    "rides.allAvailable": "所有可用共乘",
    "rides.allAvailableDesc": "瀏覽所有前往淨灘活動的共乘",
    "rides.noRides": "尚無共乘",
    "rides.noRidesDesc": "成為第一個提供共乘的人！",
    "rides.noRidesDescSignin": "請先登入以開始使用。",
    "rides.backToRides": "返回共乘列表",
    "rides.rideNotFound": "找不到行程",
    "rides.rideNotFoundDesc": "此行程可能已被取消或移除。",

    // Ride Card
    "ride.yourRide": "你的行程",
    "ride.chatAvailable": "可使用聊天",
    "ride.past": "已過期",
    "ride.full": "已滿",
    "ride.seatsLeft": "個空位",
    "ride.seatLeft": "個空位",
    "ride.passengers": "位乘客",
    "ride.noSeats": "沒有空位",
    "ride.noSeatsTooltip": "此行程已滿，請稍後再查看！",
    "ride.signInToJoin": "登入以加入",
    "ride.joinRide": "加入行程",
    "ride.joinThisRide": "加入此行程",
    "ride.leaveRide": "退出行程",
    "ride.joinedSuccess": "你已成功加入此行程！",
    "ride.leftSuccess": "你已退出此行程。",
    "ride.joinFailed": "加入行程失敗",
    "ride.leaveFailed": "退出行程失敗",

    // Ride Detail
    "rideDetail.driver": "司機",
    "rideDetail.departure": "出發地點",
    "rideDetail.dateTime": "日期與時間",
    "rideDetail.seats": "座位",
    "rideDetail.filled": "已填滿",
    "rideDetail.passengers": "乘客",
    "rideDetail.joinChat": "加入此行程即可使用群組聊天，與司機及其他乘客協調。",
    "rideDetail.joined": "已加入",
    "rideDetail.forEvent": "所屬活動",
    "rideDetail.cancelled": "已取消",

    // Create Ride
    "createRide.title": "提供共乘",
    "createRide.description": "分享你的共乘至淨灘活動。選擇活動並填寫以下資訊。",
    "createRide.selectEvent": "選擇淨灘活動",
    "createRide.selectEventPlaceholder": "選擇活動...",
    "createRide.noEvents": "目前沒有可用的活動",
    "createRide.departureLocation": "出發地點",
    "createRide.departureLocationPlaceholder": "例如：市立圖書館停車場",
    "createRide.date": "日期",
    "createRide.time": "時間",
    "createRide.availableSeats": "可用座位",
    "createRide.notes": "備註",
    "createRide.notesOptional": "（選填）",
    "createRide.notesPlaceholder": "例如：在北門入口集合，找藍色休旅車",
    "createRide.cancel": "取消",
    "createRide.creating": "建立中...",
    "createRide.create": "建立行程",
    "createRide.success": "行程建立成功！乘客現在可以加入你的行程。",
    "createRide.failed": "建立行程失敗",
    "createRide.errorLocation": "請輸入出發地點",
    "createRide.errorDateTime": "請選擇出發日期和時間",
    "createRide.errorFuture": "出發時間必須在未來",
    "createRide.errorSeats": "座位數必須在 1 到 20 之間",
    "createRide.errorEvent": "請選擇淨灘活動",
    "createRide.errorTimeAfterEvent": "出發時間必須早於活動開始時間",
    "createRide.eventStarts": "活動開始時間",
    "createRide.pickOnMap": "在地圖上選擇",
    "createRide.searchLocation": "搜尋地點...",
    "createRide.mapHint": "點擊地圖設定上車地點，或拖曳圖釘調整位置。",
    "createRide.shareTitle": "行程已建立！",
    "createRide.shareDesc": "分享此行程讓更多人加入。",
    "createRide.copyLink": "複製連結",
    "createRide.linkCopied": "連結已複製！",
    "createRide.shareOnTwitter": "分享到 X",
    "createRide.shareOnFacebook": "分享到 Facebook",
    "createRide.shareOnLine": "分享到 LINE",
    "createRide.shareText": "一起搭共乘去淨灘吧！🌊",
    "createRide.done": "完成",

    // Cover Image
    "admin.coverImage": "封面圖片",
    "admin.uploadCover": "上傳封面",
    "admin.removeCover": "移除",
    "admin.coverUploading": "上傳中...",
    "admin.coverUploaded": "封面圖片已上傳！",
    "admin.coverUploadFailed": "上傳封面圖片失敗",

    // Map
    "map.viewPickup": "查看上車地點",
    "map.pickupLocation": "上車地點",

    // Profile
    "profile.myRides": "我的行程",
    "profile.joined": "已加入",
    "profile.driving": "我提供的行程",
    "profile.passenger": "我加入的行程",
    "profile.active": "進行中",
    "profile.cancelled": "已取消",
    "profile.confirmed": "已確認",
    "profile.noRidesOffered": "尚未提供任何行程",
    "profile.noRidesOfferedDesc": "提供共乘幫助志工夥伴前往淨灘活動！",
    "profile.noRidesJoined": "尚未加入任何行程",
    "profile.noRidesJoinedDesc": "在首頁瀏覽可用的共乘並加入！",
    "profile.cancelRide": "取消此行程？",
    "profile.cancelRideDesc": "這將通知所有乘客行程已被取消。此操作無法撤銷。",
    "profile.keepRide": "保留行程",
    "profile.cancelRideBtn": "取消行程",
    "profile.rideCancelled": "行程已成功取消",
    "profile.cancelFailed": "取消行程失敗",
    "profile.leftRide": "你已退出行程",
    "profile.leaveFailed": "退出行程失敗",

    // Admin Events
    "admin.panel": "管理面板",
    "admin.manageEvents": "管理淨灘活動",
    "admin.manageEventsDesc": "建立和管理淨灘活動。司機可以為每個活動提供共乘。",
    "admin.createEvent": "建立活動",
    "admin.createEventTitle": "建立淨灘活動",
    "admin.createEventDesc": "建立新的淨灘活動，司機可以為此活動提供共乘。",
    "admin.eventTitle": "活動名稱",
    "admin.eventTitlePlaceholder": "例如：三月萬里淨灘活動",
    "admin.beachLocation": "海灘 / 地點",
    "admin.beachLocationPlaceholder": "例如：新北市萬里海灘",
    "admin.date": "日期",
    "admin.startTime": "開始時間",
    "admin.description": "說明",
    "admin.descriptionOptional": "（選填）",
    "admin.descriptionPlaceholder": "描述淨灘活動、需要攜帶的物品等。",
    "admin.cancel": "取消",
    "admin.creating": "建立中...",
    "admin.createEventBtn": "建立活動",
    "admin.editEvent": "編輯活動",
    "admin.title": "名稱",
    "admin.location": "地點",
    "admin.status": "狀態",
    "admin.statusUpcoming": "即將舉辦",
    "admin.statusActive": "進行中",
    "admin.statusCompleted": "已完成",
    "admin.statusCancelled": "已取消",
    "admin.saving": "儲存中...",
    "admin.saveChanges": "儲存變更",
    "admin.cancelEvent": "取消此活動？",
    "admin.cancelEventDesc": "這將取消此活動，並自動取消所有進行中的共乘。共乘紀錄將被保留。此操作無法復原。",
    "admin.cancelEventBtn": "取消活動",
    "admin.keepEventOpen": "保持活動開放",
    "admin.eventCancelled": "活動已成功取消。",
    "admin.eventCancelFailed": "取消活動失敗。",
    "admin.deleteEvent": "刪除此活動？",
    "admin.deleteEventDesc": "這將永久刪除此活動。已有共乘的活動無法刪除。",
    "admin.keepEvent": "保留活動",
    "admin.deleteEventBtn": "刪除活動",
    "admin.noEvents": "尚無活動",
    "admin.noEventsDesc": "建立你的第一個淨灘活動以開始使用。",
    "admin.eventCreated": "活動建立成功！",
    "admin.eventCreateFailed": "建立活動失敗",
    "admin.eventUpdated": "活動已更新！",
    "admin.eventUpdateFailed": "更新活動失敗",
    "admin.eventDeleted": "活動已刪除",
    "admin.eventDeleteFailed": "刪除活動失敗",
    "admin.accessRequired": "需要管理員權限",
    "admin.accessRequiredDesc": "你需要管理員權限才能管理活動。",

    // Chat
    "chat.title": "行程聊天",
    "chat.messages": "則訊息",
    "chat.noMessages": "尚無訊息",
    "chat.startConversation": "開始對話以協調你的行程！",
    "chat.placeholder": "輸入訊息...",
    "chat.sendFailed": "傳送訊息失敗",
    "chat.today": "今天",
    "chat.yesterday": "昨天",

    // Event status (reusable)
    "event.statusUpcoming": "即將舉辦",
    "event.statusActive": "進行中",
    "event.statusCompleted": "已完成",
    "event.statusCancelled": "已取消",

    // Home page
    "home.subtitle": "WaveNova 淨灘活動",
    "home.titlePart1": "共享車程，",
    "home.titlePart2": "守護海岸",
    "home.description": "與志工夥伴一起前往每月淨灘活動。提供或尋找共乘——一起減少碳排放，創造更大的影響力。",
    "home.activeRides": "進行中的行程",
    "home.passengersJoined": "位乘客已加入",
    "home.fewerCars": "更少車輛，更潔淨的海岸",
    "home.upcomingEvents": "即將舉辦的活動",
    "home.upcomingEventsDesc": "提供共乘的淨灘活動",
    "home.noEvents": "目前沒有即將舉辦的活動，請稍後再查看！",
    "home.rideAvailable": "個共乘可用",
    "home.ridesAvailable": "個共乘可用",
    "home.allRides": "所有可用共乘",
    "home.allRidesDesc": "瀏覽所有前往淨灘活動的共乘",
    "home.noRidesTitle": "尚無共乘",
    "home.noRidesDesc": "成為第一個提供共乘的人！",
    "home.signInToStart": "請先登入以開始使用。",
    "home.footerTagline": "減少碳排放，一趟共乘開始。",

    // Footer
    "footer.tagline": "減少碳排放，一趟共乘開始。",

    // 404
    "notFound.title": "找不到頁面",
    "notFound.description": "這個頁面似乎已經漂流到大海了。讓我們帶你回到正軌。",
    "notFound.backHome": "回到首頁",

    // Luma Verification
    "luma.verifiedAttendee": "已驗證參加者",
    "luma.verifiedTooltip": "此司機已在 Luma 活動頁面驗證為參加者",
    "luma.unverified": "未驗證",
    "luma.unverifiedTooltip": "此司機無法被驗證為 Luma 活動參加者",
    "admin.lumaEventUrl": "Luma 活動連結",
    "admin.lumaEventUrlPlaceholder": "例如：https://lu.ma/beach-cleanup-march",
    "admin.lumaEventUrlHint": "連結 Luma 活動以驗證司機是否為已報名的參加者",
    // Luma block screen
    "luma.notRegisteredTitle": "需要 Luma 報名",
    "luma.notRegisteredDesc": "要為此活動提供共乘，您必須是 Luma 活動頁面上的已報名參加者。",
    "luma.notRegisteredReason": "您的電子郵件不在賓客名單上",
    "luma.notRegisteredHint": "只有在 Luma 上報名的志工才能提供共乘，以確保安全與協調。",
    "luma.notRegisteredSteps": "如何完成驗證：",
    "luma.step1": "點擊下方按鈕開啟 Luma 活動頁面",
    "luma.step2": "使用與此處登入相同的電子郵件報名",
    "luma.step3": "回來再次嘗試提供共乘",
    "luma.verifiedBadgePreview": "報名後，您的共乘卡片將顯示「已驗證參加者」徽章",
    "luma.registerOnLuma": "前往 Luma 報名",
    "luma.tryAgain": "重試",
    "luma.registrationRequired": "提供共乘需要先在 Luma 報名。",
    "luma.registerHere": "點此報名",
    "luma.passengerNotRegistered": "需要 Luma 報名",
    "luma.passengerNotRegisteredDesc": "您必須在 Luma 活動頁面上報名才能加入此共乘。請點擊「前往 Luma 報名」進行報名。",

    // Common
    "common.at": "於",
    "common.user": "使用者",
    "common.driver": "司機",
    "common.passenger": "乘客",
    "common.loading": "載入中...",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

// ─── Context ────────────────────────────────────────────────────

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

const STORAGE_KEY = "wavenova-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "zh-TW") return stored;
    } catch {}
    return "en";
  });

  const setLocale = useCallback((newLocale: Locale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {}
  }, []);

  const t = useCallback(
    (key: TranslationKey): string => {
      return translations[locale][key] ?? translations.en[key] ?? key;
    },
    [locale]
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
