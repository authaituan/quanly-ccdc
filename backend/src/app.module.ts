import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AssetsModule } from './modules/assets/assets.module';
import { SitesModule } from './modules/sites/sites.module';
import { CredentialsModule } from './modules/credentials/credentials.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { AssignmentsModule } from './modules/assignments/assignments.module';
import { MaintenanceModule } from './modules/maintenance/maintenance.module';
import { LicensesModule } from './modules/licenses/licenses.module';
import { AssetCategoriesModule } from './modules/asset-categories/asset-categories.module';

// NOTE (phase discipline): AuthModule (AUTH-01, AUTH-02) added 2026-08-10.
// UsersModule (USER-01) added 2026-08-11. EmployeesModule + AssignmentsModule
// (ASSIGN-01) added 2026-08-11. MaintenanceModule (MAINT-01) + LicensesModule
// (LIC-01) added 2026-08-11 - last 2 backend modules with only a DB table
// and no route are now done. AssetCategoriesModule (AC-01) added 2026-08-11
// during FE-04 - dropdown "Loại máy" ở frontend cần GET /asset-categories,
// trước đó không route nào trả danh sách category (chỉ có seed).
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    AssetsModule,
    SitesModule,
    CredentialsModule,
    UsersModule,
    EmployeesModule,
    AssignmentsModule,
    MaintenanceModule,
    LicensesModule,
    AssetCategoriesModule,
  ],
})
export class AppModule {}
