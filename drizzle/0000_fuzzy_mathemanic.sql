CREATE TABLE `math_stats` (
	`profile_id` text PRIMARY KEY NOT NULL,
	`medals` real DEFAULT 0 NOT NULL,
	`stars` real DEFAULT 0 NOT NULL,
	`total_matches` integer DEFAULT 0 NOT NULL,
	`total_questions` integer DEFAULT 0 NOT NULL,
	`correct_answers` integer DEFAULT 0 NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`fastest_answer_sec` real,
	`win_streak` integer DEFAULT 0 NOT NULL,
	`wrong_book_json` text DEFAULT '[]' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `profiles` (`id`, `display_name`) VALUES ('dad', 'Dad');
--> statement-breakpoint
INSERT INTO `profiles` (`id`, `display_name`) VALUES ('abby', 'Abby');
--> statement-breakpoint
CREATE TABLE `reading_progress` (
	`profile_id` text NOT NULL,
	`stop_id` integer NOT NULL,
	`notes_json` text DEFAULT '[]' NOT NULL,
	`shields_json` text DEFAULT '[]' NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	PRIMARY KEY(`profile_id`, `stop_id`),
	FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON UPDATE no action ON DELETE cascade
);
