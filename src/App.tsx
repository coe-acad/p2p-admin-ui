import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { AdminGuard } from "@/components/AdminGuard";
import { AuditPage } from "@/pages/AuditPage";
import { BuyerTransactionDetailPage } from "@/pages/BuyerTransactionDetailPage";
import { CatalogDetailPage } from "@/pages/CatalogDetailPage";
import { CatalogsPage } from "@/pages/CatalogsPage";
import { DashboardLayout } from "@/pages/DashboardLayout";
import { LedgerPage } from "@/pages/LedgerPage";
import { LoginPage } from "@/pages/LoginPage";
import { OverviewPage } from "@/pages/OverviewPage";
import { PaymentDetailPage } from "@/pages/PaymentDetailPage";
import { PaymentsPage } from "@/pages/PaymentsPage";
import { RefundsPage } from "@/pages/RefundsPage";
import { SellerTransactionDetailPage } from "@/pages/SellerTransactionDetailPage";
import { SettlementDetailPage } from "@/pages/SettlementDetailPage";
import { SettlementsPage } from "@/pages/SettlementsPage";
import { TransactionsPage } from "@/pages/TransactionsPage";
import { UnauthorizedPage } from "@/pages/UnauthorizedPage";
import { UserDetailPage } from "@/pages/UserDetailPage";
import { UsersPage } from "@/pages/UsersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />

        <Route
          element={
            <AdminGuard>
              <DashboardLayout />
            </AdminGuard>
          }
        >
          <Route index element={<OverviewPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/users/:phone" element={<UserDetailPage />} />

          <Route path="/transactions" element={<TransactionsPage />} />
          <Route
            path="/transactions/buyer/:txnId"
            element={<BuyerTransactionDetailPage />}
          />
          <Route
            path="/transactions/seller/:txnId"
            element={<SellerTransactionDetailPage />}
          />

          <Route path="/payments" element={<PaymentsPage />} />
          <Route path="/payments/:orderId" element={<PaymentDetailPage />} />
          <Route path="/refunds" element={<RefundsPage />} />
          <Route path="/settlements" element={<SettlementsPage />} />
          <Route path="/settlements/:txnId" element={<SettlementDetailPage />} />
          <Route path="/catalogs" element={<CatalogsPage />} />
          <Route path="/catalogs/:catalogId" element={<CatalogDetailPage />} />
          <Route path="/ledger" element={<LedgerPage />} />
          <Route path="/audit" element={<AuditPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
