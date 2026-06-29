ALTER TABLE `events` ADD `lumaEventUrl` text;--> statement-breakpoint
ALTER TABLE `rides` ADD `isVerifiedAttendee` int DEFAULT 0 NOT NULL;