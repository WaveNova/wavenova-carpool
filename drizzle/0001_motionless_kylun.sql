CREATE TABLE `ride_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`rideId` int NOT NULL,
	`passengerId` int NOT NULL,
	`requestStatus` enum('confirmed','cancelled') NOT NULL DEFAULT 'confirmed',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ride_requests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`driverId` int NOT NULL,
	`departureLocation` text NOT NULL,
	`departureTime` bigint NOT NULL,
	`totalSeats` int NOT NULL,
	`notes` text,
	`rideStatus` enum('active','cancelled','completed') NOT NULL DEFAULT 'active',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
