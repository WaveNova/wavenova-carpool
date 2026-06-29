CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`userId` int NOT NULL,
	`message` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`title` varchar(500) NOT NULL,
	`description` text,
	`location` varchar(500) NOT NULL,
	`eventDate` bigint NOT NULL,
	`eventStatus` enum('upcoming','active','completed','cancelled') NOT NULL DEFAULT 'upcoming',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `rides` ADD `eventId` int;