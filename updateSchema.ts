import pg from 'pg';
import * as schema from './shared/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function main() {
  console.log('Updating database schema...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Create roles table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "roles" (
        "id" serial PRIMARY KEY NOT NULL,
        "name" text NOT NULL,
        "description" text,
        "is_default" boolean DEFAULT false,
        "created_at" timestamp DEFAULT now(),
        CONSTRAINT "roles_name_unique" UNIQUE("name")
      );
    `);
    
    // Create role_permissions table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS "role_permissions" (
        "role_id" integer NOT NULL,
        "permission" text NOT NULL,
        CONSTRAINT "role_permissions_role_id_permission_pk" PRIMARY KEY("role_id","permission")
      );
    `);
    
    // Add foreign key constraint to role_permissions table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'role_permissions_role_id_roles_id_fk'
        ) THEN
          ALTER TABLE "role_permissions" 
          ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" 
          FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE cascade;
        END IF;
      END $$;
    `);
    
    // Update users table to add role_id column if it doesn't exist
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'users' AND column_name = 'role_id'
        ) THEN
          ALTER TABLE "users" ADD COLUMN "role_id" integer;
          
          ALTER TABLE "users" 
          ADD CONSTRAINT "users_role_id_roles_id_fk" 
          FOREIGN KEY ("role_id") REFERENCES "roles"("id");
        END IF;
      END $$;
    `);
    
    // Update api_tokens table
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_tokens' AND column_name = 'role_id'
        ) THEN
          ALTER TABLE "api_tokens" ADD COLUMN "role_id" integer;
          
          ALTER TABLE "api_tokens" 
          ADD CONSTRAINT "api_tokens_role_id_roles_id_fk" 
          FOREIGN KEY ("role_id") REFERENCES "roles"("id");
        END IF;
        
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'api_tokens' AND column_name = 'permissions'
        ) THEN
          ALTER TABLE "api_tokens" RENAME COLUMN "permissions" TO "custom_permissions";
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('Schema update completed');
    
    // Insert default roles if they don't exist
    await client.query('BEGIN');
    
    const { rows: adminExists } = await client.query(`
      SELECT id FROM roles WHERE name = 'admin' LIMIT 1
    `);
    
    if (adminExists.length === 0) {
      console.log('Creating admin role...');
      const { rows: adminRole } = await client.query(`
        INSERT INTO roles (name, description, is_default)
        VALUES ('admin', 'Administrator with full system access', false)
        RETURNING id
      `);
      
      // Add all permissions to admin role
      for (const permission of Object.values(schema.PERMISSIONS)) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission)
          VALUES ($1, $2)
        `, [adminRole[0].id, permission]);
      }
    }
    
    const { rows: userExists } = await client.query(`
      SELECT id FROM roles WHERE name = 'user' LIMIT 1
    `);
    
    if (userExists.length === 0) {
      console.log('Creating user role...');
      const { rows: userRole } = await client.query(`
        INSERT INTO roles (name, description, is_default)
        VALUES ('user', 'Regular user with limited access', true)
        RETURNING id
      `);
      
      // Add basic permissions to user role
      const basicPermissions = [
        schema.PERMISSIONS.VIEW_USERS,
        schema.PERMISSIONS.VIEW_LDAP_CONNECTIONS,
        schema.PERMISSIONS.VIEW_AD_USERS,
        schema.PERMISSIONS.VIEW_AD_GROUPS,
        schema.PERMISSIONS.VIEW_AD_OUS,
        schema.PERMISSIONS.VIEW_AD_COMPUTERS,
        schema.PERMISSIONS.VIEW_AD_DOMAINS
      ];
      
      for (const permission of basicPermissions) {
        await client.query(`
          INSERT INTO role_permissions (role_id, permission)
          VALUES ($1, $2)
        `, [userRole[0].id, permission]);
      }
    }
    
    const { rows: apiExists } = await client.query(`
      SELECT id FROM roles WHERE name = 'api' LIMIT 1
    `);
    
    if (apiExists.length === 0) {
      console.log('Creating api role...');
      await client.query(`
        INSERT INTO roles (name, description, is_default)
        VALUES ('api', 'API access with customizable permissions', false)
      `);
    }
    
    // Update existing users to have the admin role if they have no role assigned
    await client.query(`
      DO $$
      DECLARE
        admin_role_id integer;
      BEGIN
        SELECT id INTO admin_role_id FROM roles WHERE name = 'admin' LIMIT 1;
        
        IF admin_role_id IS NOT NULL THEN
          UPDATE users SET role_id = admin_role_id WHERE role_id IS NULL;
        END IF;
      END $$;
    `);
    
    await client.query('COMMIT');
    console.log('Data migration completed successfully');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
