import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { CurrencyProvider } from './context/CurrencyContext';
import { ToastProvider } from './context/ToastContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar, TabType } from './components/common/Sidebar';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { DashboardPage } from './pages/DashboardPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { ReportsPage } from './pages/ReportsPage';
import { DocsPage } from './pages/DocsPage';
import { BotChatPage } from './pages/BotChatPage';
import { TransactionModal } from './components/transactions/TransactionModal';
import { CategoryModal } from './components/categories/CategoryModal';
import { BudgetModal } from './components/budgets/BudgetModal';
import { useFinance } from './hooks/useFinance';
import { Transaction, Category, Budget, TransactionType } from './types';
import { Loader2 } from 'lucide-react';

function MainApp() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register' | 'forgot'>('login');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal States
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('expense');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState<Category | null>(null);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);

  // Connect Finance Hook
  const finance = useFinance(user);

  // 1. Initial Authentication Loading State
  if (isAuthLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-sky-500 mb-3" />
        <p className="text-xs font-semibold tracking-wide uppercase">Memuat FinTrack...</p>
      </div>
    );
  }

  // 2. Unauthenticated Views (Login / Register / Forgot Password)
  if (!user) {
    if (authView === 'register') {
      return <RegisterPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    if (authView === 'forgot') {
      return <ForgotPasswordPage onNavigateToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginPage
        onNavigateToRegister={() => setAuthView('register')}
        onNavigateToForgotPassword={() => setAuthView('forgot')}
      />
    );
  }

  // 3. Authenticated App Layout
  const handleOpenCreateTx = (type: TransactionType = 'expense') => {
    setSelectedTx(null);
    setTxModalType(type);
    setIsTxModalOpen(true);
  };

  const handleEditTx = (tx: Transaction) => {
    setSelectedTx(tx);
    setTxModalType(tx.type);
    setIsTxModalOpen(true);
  };

  const handleOpenCreateCat = () => {
    setSelectedCat(null);
    setIsCatModalOpen(true);
  };

  const handleEditCat = (cat: Category) => {
    setSelectedCat(cat);
    setIsCatModalOpen(true);
  };

  const handleOpenCreateBudget = () => {
    setSelectedBudget(null);
    setIsBudgetModalOpen(true);
  };

  const handleEditBudget = (b: Budget) => {
    setSelectedBudget(b);
    setIsBudgetModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex transition-colors font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={(tab) => setCurrentTab(tab)}
        isOpen={isSidebarOpen}
        onCloseMobile={() => setIsSidebarOpen(false)}
      />

      {/* Main Content View with Header */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Navbar
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenDocs={() => setCurrentTab('docs')}
          onNavigateToBudgets={() => setCurrentTab('budgets')}
          currentTab={currentTab}
          budgetAlerts={finance.overBudgets}
        />

        {/* Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {currentTab === 'dashboard' && (
            <DashboardPage
              summary={finance.summary}
              trend={finance.trend}
              categories={finance.categories}
              budgets={finance.budgets}
              onOpenTransactionModal={handleOpenCreateTx}
              onNavigateToTransactions={() => setCurrentTab('transactions')}
              onNavigateToBudgets={() => setCurrentTab('budgets')}
              onOpenCreateBudget={handleOpenCreateBudget}
              onNavigateToBot={() => setCurrentTab('bot')}
              onExportPDF={finance.exportPDF}
              overBudgets={finance.overBudgets}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsPage
              transactions={finance.transactions}
              categories={finance.categories}
              onOpenCreateModal={() => handleOpenCreateTx('expense')}
              onEditTransaction={handleEditTx}
              onDeleteTransaction={finance.deleteTransaction}
              onExportCSV={finance.exportCSV}
              onExportPDF={finance.exportPDF}
              isLoading={finance.isLoading}
            />
          )}

          {currentTab === 'categories' && (
            <CategoriesPage
              categories={finance.categories}
              budgets={finance.budgets}
              onOpenCreateModal={handleOpenCreateCat}
              onEditCategory={handleEditCat}
              onDeleteCategory={finance.deleteCategory}
              onOpenCreateBudget={handleOpenCreateBudget}
              onEditBudget={handleEditBudget}
            />
          )}

          {currentTab === 'budgets' && (
            <BudgetsPage
              budgets={finance.budgets}
              currentMonth={finance.budgetMonth}
              currentYear={finance.budgetYear}
              onChangePeriod={finance.changeBudgetPeriod}
              onOpenCreateModal={handleOpenCreateBudget}
              onEditBudget={handleEditBudget}
              onDeleteBudget={finance.deleteBudget}
            />
          )}

          {currentTab === 'recurring' && (
            <RecurringPage
              recurringRules={finance.recurringRules}
              categories={finance.categories}
              onCreateRecurring={finance.createRecurring}
              onToggleActive={finance.toggleRecurringActive}
              onDeleteRule={finance.deleteRecurringRule}
              onProcessDue={finance.processDueRecurring}
              isProcessing={finance.isProcessingRecurring}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsPage
              summary={finance.summary}
              trend={finance.trend}
              breakdown={finance.breakdown}
              onExportCSV={finance.exportCSV}
              onExportPDF={finance.exportPDF}
            />
          )}

          {currentTab === 'bot' && (
            <BotChatPage
              onRefreshFinance={finance.refreshAll}
              onNavigateToTransactions={() => setCurrentTab('transactions')}
            />
          )}

          {currentTab === 'docs' && <DocsPage />}
        </main>
      </div>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => setIsTxModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedTx) {
            return await finance.updateTransaction(selectedTx.id, data);
          }
          return await finance.createTransaction(data);
        }}
        categories={finance.categories}
        initialData={selectedTx}
        defaultType={txModalType}
      />

      {/* Category Modal */}
      <CategoryModal
        isOpen={isCatModalOpen}
        onClose={() => setIsCatModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedCat) {
            return await finance.updateCategory(selectedCat.id, data);
          }
          return await finance.createCategory(data);
        }}
        initialData={selectedCat}
      />

      {/* Budget Modal */}
      <BudgetModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        onSubmit={async (data) => {
          if (selectedBudget) {
            return await finance.updateBudget(selectedBudget.id, data);
          }
          return await finance.saveBudget(data);
        }}
        categories={finance.categories}
        initialData={selectedBudget}
        currentMonth={finance.budgetMonth}
        currentYear={finance.budgetYear}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <CurrencyProvider>
          <AuthProvider>
            <MainApp />
          </AuthProvider>
        </CurrencyProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}
