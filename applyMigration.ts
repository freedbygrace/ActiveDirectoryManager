import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import pg from 'pg';
import * as schema from './shared/schema';

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle(pool, { schema });

async function main() {
  console.log('Applying migrations...');
  
  try {
    // Apply the migrations
    await migrate(db, { migrationsFolder: './migrations' });
    console.log('Migrations applied successfully');

    // Insert default roles if they don't exist
    await db.transaction(async (tx) => {
      const adminRoleExists = await tx.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, 'admin')
      });

      if (!adminRoleExists) {
        console.log('Creating admin role...');
        const [adminRole] = await tx.insert(schema.roles).values({
          name: 'admin',
          description: 'Administrator with full system access',
          isDefault: false
        }).returning();
        
        // Add all permissions to admin role
        const permissions = Object.values(schema.PERMISSIONS);
        await Promise.all(permissions.map(permission => 
          tx.insert(schema.rolePermissions).values({
            roleId: adminRole.id,
            permission
          })
        ));
      }

      const userRoleExists = await tx.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, 'user')
      });

      if (!userRoleExists) {
        console.log('Creating user role...');
        const [userRole] = await tx.insert(schema.roles).values({
          name: 'user',
          description: 'Regular user with limited access',
          isDefault: true
        }).returning();
        
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
        
        await Promise.all(basicPermissions.map(permission => 
          tx.insert(schema.rolePermissions).values({
            roleId: userRole.id,
            permission
          })
        ));
      }

      const apiRoleExists = await tx.query.roles.findFirst({
        where: (roles, { eq }) => eq(roles.name, 'api')
      });

      if (!apiRoleExists) {
        console.log('Creating api role...');
        await tx.insert(schema.roles).values({
          name: 'api',
          description: 'API access with customizable permissions',
          isDefault: false
        });
      }
    });

    console.log('Setup completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await pool.end();
  }
}

main();
