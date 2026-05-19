import './SubPages.css'
import './DocsPage.css'
import { useEffect, useContext, useState } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'
import { FiLock, FiSettings, FiUsers, FiShoppingBag, FiCheckCircle } from 'react-icons/fi'

const DocsPage = () => {
  const { storePath } = useContext(ContextProvider)
  const [activeTab, setActiveTab] = useState('getting-started')

  useEffect(() => {
    storePath('docs')
    document.title = "Documentation | Enterprise Compute"
    window.scrollTo(0, 0)
  }, [storePath])

  const sections = [
    {
      id: 'auth',
      title: 'Authentication',
      icon: <FiLock />,
      topics: [
        { id: 'login', title: 'Login Process' },
        { id: 'tenant-admin-login', title: 'Tenant Admin Root Login' },
        { id: 'signup', title: 'Sign Up' },
        { id: 'forgot-password', title: 'Forgot Password' },
      ]
    },
    {
      id: 'onboarding',
      title: 'Onboarding',
      icon: <FiCheckCircle />,
      topics: [
        { id: 'tenant-setup', title: 'Company Onboarding' },
        { id: 'pricing-apps', title: 'App Selection' },
        { id: 'payments', title: 'Payment Processing' },
      ]
    },
    {
      id: 'setup',
      title: 'System Setup',
      icon: <FiSettings />,
      topics: [
        { id: 'chart-of-accounts', title: 'Chart of Accounts' },
        { id: 'account-mapping', title: 'Account Mapping' },
        { id: 'accounting-operations', title: 'Journals, Closings & Reports' },
        { id: 'settings-guide', title: 'Settings Masterclass' },
        { id: 'billing-admin', title: 'Billing & Central Admin' },
      ]
    },
    {
      id: 'hr-admin',
      title: 'HR & Admin',
      icon: <FiUsers />,
      topics: [
        { id: 'org-structure', title: 'Org Structure' },
        { id: 'user-management', title: 'User Management' },
        { id: 'attendance-payroll', title: 'Attendance & Payroll' },
      ]
    },
    {
      id: 'commerce',
      title: 'Commerce & POS',
      icon: <FiShoppingBag />,
      topics: [
        { id: 'pos-ops', title: 'POS Operations' },
        { id: 'inventory', title: 'Inventory Management' },
        { id: 'production-orders', title: 'Production & Assembly' },
        { id: 'assets', title: 'Asset Management' },
        { id: 'sales-purchase', title: 'Sales & Purchases' },
        { id: 'logistics-expenses', title: 'Delivery & Expenses' },
        { id: 'accommodation', title: 'Accommodation' },
      ]
    }
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'login':
        return (
          <article className="docs-article">
            <h1>Login Process</h1>
            <p>Accessing your Enterprise Compute workspace is secure and straightforward. The login system supports multi-tenant isolation, ensuring your data remains private.</p>
            
            <div className="docs-step">
              <h4><span className="docs-step-number">1</span> Visit Login Page</h4>
              <p>Navigate to the login portal. You will be prompted to enter your registered email address and password.</p>
            </div>

            <div className="docs-step">
              <h4><span className="docs-step-number">2</span> Tenant Validation</h4>
              <p>Normal users should sign in through their tenant workspace URL, such as <code>company.epxcentral.com</code> or <code>company.localhost:3000</code> during local development.</p>
            </div>

            <div className="docs-note">
              <h4>Note on Session Security</h4>
              <p>Sessions are valid for 24 hours. After this period, or upon explicit logout, you will need to re-authenticate.</p>
            </div>
          </article>
        )

      case 'tenant-admin-login':
        return (
          <article className="docs-article">
            <h1>Tenant Admin Root Login</h1>
            <p>Tenant administrators can sign in from the root platform address and be routed safely into their company workspace.</p>

            <div className="docs-step">
              <h4><span className="docs-step-number">1</span> Start From Root Platform</h4>
              <p>Admins may log in from <code>epxcentral.com/login</code>. In local development, <code>localhost:3000/login</code> behaves the same way.</p>
            </div>

            <div className="docs-step">
              <h4><span className="docs-step-number">2</span> Admin-Only Verification</h4>
              <p>The server checks the central profile and confirms the matching tenant profile is an administrator. Non-admins and wrong credentials receive the same safe invalid-login message.</p>
            </div>

            <div className="docs-step">
              <h4><span className="docs-step-number">3</span> Secure Workspace Handoff</h4>
              <p>After verification, the system creates a short-lived handoff code and redirects the admin to <code>tenant.epxcentral.com</code> or <code>tenant.localhost:3000</code>. The handoff is redeemed inside the tenant workspace and the dashboard opens from there.</p>
            </div>

            <div className="docs-note">
              <h4>Security Note</h4>
              <p>Sub-users must log in through their tenant subdomain. The root platform login is reserved for tenant administrators only.</p>
            </div>
          </article>
        )

      case 'signup':
        return (
          <article className="docs-article">
            <h1>Sign Up & Registration</h1>
            <p>Joining Enterprise Compute allows you to create a dedicated cloud environment for your business operations.</p>
            
            <h3>Registration Steps</h3>
            <ol>
              <li><strong>Personal Details:</strong> Provide your name, email, and contact information.</li>
              <li><strong>Company Identity:</strong> Enter your legal business name. This generates your unique Tenant ID.</li>
              <li><strong>Subdomain Choice:</strong> Pick a unique handle that will serve as your workspace address.</li>
              <li><strong>Verification:</strong> Confirm your email address via the link sent to your inbox.</li>
            </ol>

            <div className="docs-note">
              <h4>Domain Uniqueness</h4>
              <p>Subdomains cannot be changed after registration. Choose a name that aligns with your brand permanently.</p>
            </div>
          </article>
        )

      case 'forgot-password':
        return (
          <article className="docs-article">
            <h1>Forgot Password</h1>
            <p>If you lose access to your account, our automated recovery system will help you get back in.</p>
            
            <div className="docs-step">
              <h4>Trigger Recovery</h4>
              <p>Click "Forgot Password" on the login screen and enter your email. A secure, one-time-use reset link will be generated.</p>
            </div>

            <div className="docs-step">
              <h4>Email Verification</h4>
              <p>The link is valid for 30 minutes. Check your spam folder if you do not see the email within 2 minutes.</p>
            </div>
          </article>
        )

      case 'tenant-setup':
        return (
          <article className="docs-article">
            <h1>Company Onboarding</h1>
            <p>Once registered, the onboarding process initializes your private infrastructure.</p>
            
            <h3>The Initialization Sequence</h3>
            <ul>
              <li><strong>Database Provisioning:</strong> A dedicated MongoDB instance is created for your tenant.</li>
              <li><strong>Schema Seeding:</strong> Default collections for settings, users, and logs are established.</li>
              <li><strong>Admin Profile:</strong> Your registration account is promoted to the "Super Admin" role.</li>
            </ul>

            <div className="docs-note">
              <h4>First Login Experience</h4>
              <p>During the first login, the system may take up to 15 seconds to finalize your workspace environment.</p>
            </div>
          </article>
        )

      case 'pricing-apps':
        return (
          <article className="docs-article">
            <h1>App Selection & Pricing</h1>
            <p>Enterprise Compute is modular. You only pay for the modules you use.</p>
            
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Module</th>
                  <th>Key Features</th>
                  <th>Billing Unit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HR & Payroll</td>
                  <td>Attendance, Salaries, Tax</td>
                  <td>Per Employee</td>
                </tr>
                <tr>
                  <td>Point of Sales</td>
                  <td>Terminal, Invoicing, Tables</td>
                  <td>Per Terminal</td>
                </tr>
                <tr>
                  <td>Inventory</td>
                  <td>Stock, Warehouse, Transfer</td>
                  <td>Flat Rate</td>
                </tr>
              </tbody>
            </table>

            <h3>Activating Modules</h3>
            <p>Navigate to the "Apps" or "Pricing" section in your dashboard. Toggling a module will instantly update your workspace sidebar with the corresponding features.</p>
          </article>
        )

      case 'payments':
        return (
          <article className="docs-article">
            <h1>Live Paystack Payments</h1>
            <p>Enterprise Compute integrates with Paystack for secure subscription checkout, payment verification, invoices, and tenant billing records.</p>
            
            <div className="docs-step">
              <h4>Initiating Payment</h4>
              <p>Payments can begin from the public pricing page or from the tenant Settings Billing section. Tenants can use configured Paystack test or live mode depending on platform settings.</p>
            </div>

            <div className="docs-step">
              <h4>Verification</h4>
              <p>After checkout, the confirmation page verifies the transaction with Paystack before marking the order as paid. Webhooks and manual verification flows reconcile pending orders if a network interruption delays the first update.</p>
            </div>

            <div className="docs-note">
              <h4>Trial and Expiry</h4>
              <p>New tenants receive a 14-day Standard trial. Warning banners appear before expiry, and expired or unconfigured tenants are guided to billing or setup before continuing.</p>
            </div>
          </article>
        )

      case 'chart-of-accounts':
        return (
          <article className="docs-article">
            <h1>Chart of Accounts (COA)</h1>
            <p>The COA is the backbone of your financial tracking. Before performing any transaction, you must define your accounts.</p>
            
            <h3>Account Categories</h3>
            <ul>
              <li><strong>Assets (1000-1999):</strong> Cash, Inventory, Receivables.</li>
              <li><strong>Liabilities (2000-2999):</strong> Payables, Loans, Taxes.</li>
              <li><strong>Equity (3000-3999):</strong> Capital, Retained Earnings.</li>
              <li><strong>Revenue (4000-4999):</strong> Sales, Service Income.</li>
              <li><strong>Expenses (5000-5999):</strong> Rent, Salary, Utilities.</li>
            </ul>

            <div className="docs-note">
              <h4>Setup Tip</h4>
              <p>We provide a standard COA template with operating accounts such as Cash, Bank, Inventory, Receivables, Payables, Salary Payable, Work in Progress Inventory, Production Variance, Revenue, and Cost of Sales.</p>
            </div>
          </article>
        )

      case 'account-mapping':
        return (
          <article className="docs-article">
            <h1>Account Mapping</h1>
            <p>Account mapping tells the system which GL account to use for automated operational activities.</p>
            
            <table className="docs-table">
              <thead>
                <tr>
                  <th>Operation</th>
                  <th>Required Map</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>POS Cash Sale</td>
                  <td>Debit Cash, Credit Sales Revenue</td>
                </tr>
                <tr>
                  <td>Payroll Payment</td>
                  <td>Debit Salary Expense, Credit Bank</td>
                </tr>
                <tr>
                  <td>Inventory Purchase</td>
                  <td>Debit Stock, Credit Accounts Payable</td>
                </tr>
                <tr>
                  <td>Production Consumption</td>
                  <td>Debit Work in Progress, Credit Inventory</td>
                </tr>
                <tr>
                  <td>Production Output</td>
                  <td>Debit Inventory, Credit Work in Progress</td>
                </tr>
              </tbody>
            </table>

            <div className="docs-note">
              <h4>Usage Gate</h4>
              <p>Operational pages that post financial activity are blocked until their required G/L links are configured. Core setup pages such as Settings, Journals & COA, Employees, Departments, and Positions remain available.</p>
            </div>
          </article>
        )

      case 'settings-guide':
        return (
          <article className="docs-article">
            <h1>Settings Masterclass</h1>
            <p>The settings page is the control room of your entire enterprise.</p>
            
            <h3>1. General Settings</h3>
            <p>Define your business hours, contact info, and base currency.</p>

            <h3>2. Warehouses & Locations</h3>
            <p>Create storage points. Crucial for Inventory and POS modules to track stock correctly.</p>

            <h3>3. Payment Methods & G/L Linking</h3>
            <p>Configure Cash, Bank Transfer, POS Terminals, and Online gateways. Critically, each payment method must be linked to a Cash/Bank account in your COA.</p>

            <h3>4. Taxes, Levies & Service Charges</h3>
            <p>Setup VAT (Value Added Tax), Consumption Tax, and Service Charges. You can specify if these are inclusive or exclusive of the product price.</p>
            
            <h3>5. POS & Terminal Configuration</h3>
            <p>Enable/Disable features like "Auto-Print", "Table Management", "Kitchen Display System", and "Negative Stock Sales".</p>

            <h3>6. UOM & Product Categories</h3>
            <p>Define Units of Measurement (e.g., Kg, Litre, Pcs) and group your products for easier reporting and filtering.</p>

            <h3>7. Advanced Operational Linking</h3>
            <p>Map your operational activities to G/L accounts so the computed ledger can produce correct Trial Balance, Balance Sheet, Profit and Loss, ledgers, and dashboard summaries.</p>
          </article>
        )

      case 'accounting-operations':
        return (
          <article className="docs-article">
            <h1>Journals, Closings & Reports</h1>
            <p>The accounting module uses a computed-ledger design. Operational modules keep their own source records, manual journals stay in General Ledger entries, and reports read from the computed COA balances.</p>

            <h3>Daily Workflow</h3>
            <ol>
              <li><strong>Initialize COA:</strong> Use the predefined Chart of Accounts template or update your accounts before posting operations.</li>
              <li><strong>Configure G/L Links:</strong> In Settings, map each module to the accounts it affects. Payment methods use a separate G/L link from their bank/account number field.</li>
              <li><strong>Post Operations:</strong> Sales, POS, purchases, payroll, inventory, accommodations, assets, and expenses post their own source documents.</li>
              <li><strong>Use Journals for Adjustments:</strong> Manual journal entries should only be used for direct accounting adjustments not already represented by operational documents.</li>
              <li><strong>Review Reports:</strong> Trial Balance, Balance Sheet, Profit & Loss, and ledger drill-downs are generated from the computed COA view.</li>
            </ol>

            <h3>Closings</h3>
            <p>Closings store balances by date so the system does not recompute from the beginning every time. When reports start from a date with a prior closing, the engine uses that closing as opening balance and computes only the missing period.</p>

            <h3>Closing Action Buttons</h3>
            <ul>
              <li><strong>Build Closing:</strong> Computes and saves monthly closing balances for the selected period end without storing detailed raw ledger lines.</li>
              <li><strong>Build with Ledger:</strong> Computes the closing and includes ledger trace details for audit. It is heavier, so use it when you need proof lines.</li>
              <li><strong>Confirm Closing:</strong> Marks a closing as reviewed while still allowing correction before final lock.</li>
              <li><strong>Lock Closing:</strong> Prevents normal recomputation of that period. Locked closings require admin override to change.</li>
              <li><strong>Rebuild Closing:</strong> Recomputes the latest closing from current operational and journal records.</li>
              <li><strong>Find Late Changes:</strong> Detects changed or backdated transactions that may affect old closings and queues those dates for review.</li>
              <li><strong>Review Queue:</strong> Opens the list of closing dates waiting to be reprocessed.</li>
              <li><strong>Run Queue:</strong> Processes queued closings that are not locked.</li>
              <li><strong>Admin Override Run:</strong> Allows an admin to process queued closings even when locked periods are involved.</li>
            </ul>

            <h3>Ledger Drill-Down</h3>
            <p>Click any debit, credit, net, or report balance to view the source ledger lines behind the amount. If a balance came from a previous closing, the drill-down shows the current period lines available for that date range while the opening amount remains represented by the stored closing.</p>

            <div className="docs-note">
              <h4>Late Transactions</h4>
              <p>If a backdated purchase, asset, expense, payroll, or journal affects a prior closing, use the Journals page recompute tools to detect and reprocess affected closings. Locked closings require admin override.</p>
            </div>
          </article>
        )

      case 'billing-admin':
        return (
          <article className="docs-article">
            <h1>Billing & Central Admin</h1>
            <p>The platform separates tenant billing from central administration so each company sees its own subscriptions while the developer can monitor all tenants centrally.</p>

            <h3>Tenant Billing</h3>
            <ul>
              <li><strong>Settings Billing:</strong> Tenant admins can view subscription status, invoices, orders, payments, and Paystack checkout actions.</li>
              <li><strong>Expiry Banner:</strong> A top-layer warning appears before trial or subscription expiry and links directly to Billing.</li>
              <li><strong>Automatic Recovery:</strong> Pending Paystack orders can be verified again if a webhook or network callback was missed.</li>
            </ul>

            <h3>Central Admin</h3>
            <ul>
              <li><strong>Independent Portal:</strong> Central admin is accessed separately from tenant workspaces.</li>
              <li><strong>Tenant Control:</strong> Admins can inspect tenant usage, users, subscriptions, payments, orders, and activity.</li>
              <li><strong>Trial Controls:</strong> Trials can be started, extended, suspended, ended, or resumed for a tenant.</li>
              <li><strong>Payment Reconciliation:</strong> Central admin can trigger verification for pending orders that Paystack has already settled.</li>
            </ul>
          </article>
        )

      case 'logistics-expenses':
        return (
          <article className="docs-article">
            <h1>Delivery & Expenses</h1>
            <p>Manage the movement of goods and the outflow of petty cash efficiently.</p>
            
            <h3>Delivery Management</h3>
            <ul>
              <li><strong>Waybills:</strong> Generate waybills for outgoing stock to customers or other warehouses.</li>
              <li><strong>Driver Tracking:</strong> Assign drivers to delivery orders and track delivery status (Pending, In Transit, Delivered).</li>
              <li><strong>Shipping Costs:</strong> Automated calculation of delivery fees based on weight or distance.</li>
            </ul>

            <h3>Expense Management</h3>
            <p>Track all business expenditures that aren't inventory purchases.</p>
            <div className="docs-step">
              <h4>Voucher Creation</h4>
              <p>Create expense vouchers for rent, electricity, maintenance, etc. Each voucher requires a "Category" (Expense Account) and a "Payment Source" (Cash/Bank Account).</p>
            </div>
          </article>
        )

      case 'accommodation':
        return (
          <article className="docs-article">
            <h1>Accommodation & Room Management</h1>
            <p>Specifically designed for hotels and guest houses to manage bookings and room states.</p>
            
            <ul>
              <li><strong>Room Dashboard:</strong> Real-time view of room status (Available, Occupied, Dirty, Maintenance).</li>
              <li><strong>Check-in/Out:</strong> Capture guest details, duration of stay, and automated billing for room rates.</li>
              <li><strong>Housekeeping:</strong> Integrated alerts for housekeeping staff when a guest checks out.</li>
              <li><strong>Folio Management:</strong> Consolidate room charges, restaurant bills, and laundry into a single guest invoice.</li>
            </ul>
          </article>
        )

      case 'org-structure':
        return (
          <article className="docs-article">
            <h1>Org Structure (HR)</h1>
            <p>Define the hierarchy of your company to manage permissions and reporting.</p>
            
            <h3>Departments</h3>
            <p>Group employees by function (e.g., Accounts, Operations, Kitchen).</p>

            <h3>Positions</h3>
            <p>Define job roles and their base salary rates. These feed directly into the Payroll engine.</p>
          </article>
        )

      case 'user-management':
        return (
          <article className="docs-article">
            <h1>User Management</h1>
            <p>Control who has access to what within your workspace.</p>
            
            <div className="docs-step">
              <h4>Role-Based Access (RBAC)</h4>
              <p>Assign specific permissions to users. A "Cashier" role may only see the POS, while an "Accountant" sees the General Ledger.</p>
            </div>

            <div className="docs-note">
              <h4>Security Tip</h4>
              <p>Always use the "Least Privilege" principle—only give users access to the specific modules they need for their daily tasks.</p>
            </div>
          </article>
        )

      case 'attendance-payroll':
        return (
          <article className="docs-article">
            <h1>Attendance & Payroll</h1>
            <p>The integrated HR engine automates salary computation based on real-world data.</p>
            
            <h3>Attendance Flow</h3>
            <ol>
              <li>Employees clock in/out via terminal or mobile.</li>
              <li>Late comings and early departures are logged.</li>
              <li>The system calculates "Billable Hours" based on attendance logs.</li>
            </ol>

            <h3>Payroll Computation</h3>
            <p>At the end of the month, the Payroll engine combines Base Salary, Attendance bonuses, and Tax deductions to generate automated payslips.</p>
          </article>
        )

      case 'pos-ops':
        return (
          <article className="docs-article">
            <h1>POS Operations</h1>
            <p>The high-performance terminal designed for speed and reliability.</p>
            
            <ul>
              <li><strong>Table Management:</strong> Track open orders by table number or room.</li>
              <li><strong>Kitchen Prints:</strong> Auto-send orders to the kitchen/bar printers.</li>
              <li><strong>Split Billing:</strong> Allow customers to pay separately for a shared order.</li>
              <li><strong>Offline Mode:</strong> Continue sales even if the internet goes down. Data syncs when back online.</li>
            </ul>
          </article>
        )

      case 'inventory':
        return (
          <article className="docs-article">
            <h1>Inventory Management</h1>
            <p>Keep track of every item across all your warehouses.</p>
            
            <h3>Key Concepts</h3>
            <ul>
              <li><strong>Stock In/Out:</strong> Manual adjustments for breakage or opening stock.</li>
              <li><strong>Internal Transfers:</strong> Moving items from a Main Store to a specific POS Outlet.</li>
              <li><strong>Reorder Levels:</strong> Automated alerts when stock is running low.</li>
            </ul>
          </article>
        )

      case 'production-orders':
        return (
          <article className="docs-article">
            <h1>Production, Assembly & Deassembly</h1>
            <p>Production operations are designed to use the same inventory transaction source of truth as purchases, transfers, POS shipments, and adjustments.</p>

            <h3>How Posting Works</h3>
            <ul>
              <li><strong>Bill of Materials:</strong> Define finished goods and their component inputs.</li>
              <li><strong>Consumption:</strong> Components issued into production debit Work in Progress and credit Inventory.</li>
              <li><strong>Output:</strong> Finished goods received from production debit Inventory and credit Work in Progress.</li>
              <li><strong>Variance:</strong> Any production difference posts to Production Variance and clears against WIP.</li>
              <li><strong>Average Cost:</strong> Affected products can be recalculated after posting so inventory valuation remains aligned.</li>
            </ul>

            <div className="docs-note">
              <h4>Accounting Requirement</h4>
              <p>Inventory, Work in Progress, Cost of Sales, Inventory Adjustment, and Production Variance accounts must be linked before production-heavy inventory workflows are used.</p>
            </div>
          </article>
        )

      case 'assets':
        return (
          <article className="docs-article">
            <h1>Asset Management</h1>
            <p>The Asset module manages fixed assets from acquisition to depreciation and disposal, while the accounting engine reflects every posted asset movement in the COA.</p>

            <h3>Asset Setup</h3>
            <ol>
              <li><strong>Configure G/L Links:</strong> In Settings Accounting Links, map Fixed Asset, Accumulated Depreciation, Depreciation Expense, Asset Payable, Disposal Gain, and Disposal Loss.</li>
              <li><strong>Create Asset Groups:</strong> Define groups such as Buildings, Furniture, Equipment, or Vehicles. Each group can carry default useful life, residual rate, and depreciation type.</li>
              <li><strong>Choose Depreciation Type:</strong> Supported types include Straight Line, Reducing Balance, Manual Only, and No Depreciation.</li>
              <li><strong>Register Assets:</strong> Add acquisition cost, supplier, custodian, location, purchase date, payment status, payment method, and paid amount.</li>
              <li><strong>Post the Asset:</strong> Posting debits the fixed asset account and credits either payment method cash/bank or asset payable for unpaid balances.</li>
            </ol>

            <h3>Depreciation</h3>
            <p>Manual depreciation posts a selected amount for one asset. Automatic depreciation processes all active assets due up to the selected date. Straight Line spreads depreciable value across useful life. Reducing Balance applies the annual depreciation rate monthly to the net book value.</p>

            <h3>Disposal</h3>
            <p>Disposal clears the asset cost, clears accumulated depreciation, records sale proceeds when applicable, and posts the resulting gain or loss to the configured G/L accounts.</p>

            <div className="docs-note">
              <h4>Accounting Impact</h4>
              <p>Asset records are not converted into manual journals. They remain operational source documents and are read by the accounting engine alongside inventory, sales, payroll, purchases, expenses, and manual journals.</p>
            </div>
          </article>
        )

      case 'sales-purchase':
        return (
          <article className="docs-article">
            <h1>Sales & Purchases</h1>
            <p>Comprehensive tracking of your business commerce.</p>
            
            <h3>Sales Ledger</h3>
            <p>Automatic logging of all revenue generated through POS and Invoice modules.</p>

            <h3>Purchase Orders</h3>
            <p>Create orders for suppliers. Once received, the system automatically updates inventory levels and creates a "Payable" entry in Accounting.</p>
          </article>
        )

      default:
        return (
          <article className="docs-article">
            <h1>Welcome to the Knowledge Base</h1>
            <p>Select a topic from the sidebar to view detailed guides and best practices for managing your Enterprise Compute workspace.</p>
            
            <div className="sp-help-grid">
              {sections.map((s, i) => (
                <div key={i} className="sp-help-card" onClick={() => setActiveTab(s.topics[0].id)}>
                  <h3>{s.icon} {s.title}</h3>
                  <p>Explore {s.topics.length} detailed articles.</p>
                </div>
              ))}
            </div>
          </article>
        )
    }
  }

  return (
    <div className="ec-landing">
      <NavBar />
      
      <div className="docs-layout">
        <aside className="docs-sidebar">
          {sections.map((section) => (
            <div key={section.id} className="docs-nav-group">
              <h4>{section.title}</h4>
              {section.topics.map((topic) => (
                <a 
                  key={topic.id}
                  href={`#${topic.id}`}
                  className={`docs-nav-item ${activeTab === topic.id ? 'active' : ''}`}
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab(topic.id)
                    window.scrollTo(0, 0)
                  }}
                >
                  {topic.title}
                </a>
              ))}
            </div>
          ))}
        </aside>

        <main className="docs-content">
          {renderContent()}
        </main>
      </div>

      <Footer />
    </div>
  )
}

export default DocsPage
