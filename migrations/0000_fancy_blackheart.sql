CREATE TABLE "ad_computers" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"distinguished_name" text NOT NULL,
	"name" text NOT NULL,
	"dns_host_name" text,
	"operating_system" text,
	"operating_system_version" text,
	"last_logon" timestamp,
	"enabled" boolean DEFAULT true,
	"ad_properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_domains" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"distinguished_name" text NOT NULL,
	"name" text NOT NULL,
	"net_bios_name" text,
	"forest_name" text,
	"domain_functionality" text,
	"ad_properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"distinguished_name" text NOT NULL,
	"sam_account_name" text NOT NULL,
	"group_type" text,
	"description" text,
	"members" jsonb,
	"ad_properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_org_units" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"distinguished_name" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"ad_properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"connection_id" integer NOT NULL,
	"distinguished_name" text NOT NULL,
	"sam_account_name" text NOT NULL,
	"user_principal_name" text,
	"given_name" text,
	"surname" text,
	"display_name" text,
	"email" text,
	"enabled" boolean DEFAULT true,
	"last_logon" timestamp,
	"member_of" jsonb,
	"ad_properties" jsonb
);
--> statement-breakpoint
CREATE TABLE "api_tokens" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"token" text NOT NULL,
	"user_id" integer NOT NULL,
	"role_id" integer,
	"custom_permissions" jsonb,
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "api_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "ldap_connections" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"server" text NOT NULL,
	"domain" text NOT NULL,
	"port" integer DEFAULT 389,
	"use_ssl" boolean DEFAULT true,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"status" text DEFAULT 'disconnected',
	"last_connected" timestamp,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" integer NOT NULL,
	"permission" text NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_default" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password" text NOT NULL,
	"email" text,
	"full_name" text,
	"role_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_tokens" ADD CONSTRAINT "api_tokens_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;