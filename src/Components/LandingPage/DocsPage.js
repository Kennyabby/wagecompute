import './SubPages.css'
import './DocsPage.css'
import { useEffect, useContext, useState } from 'react'
import NavBar from './NavBar'
import Footer from './Footer'
import ContextProvider from '../../Resources/ContextProvider'
import { FiBook, FiLock, FiSettings, FiUsers, FiShoppingBag, FiCreditCard, FiCheckCircle } from 'react-icons/fi'

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
        { id: 'settings-guide', title: 'Settings Masterclass' },
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
              <p>Upon entering your email, the system identifies your company workspace. If your company uses a dedicated subdomain, ensure you are on the correct URL (e.g., <code>company.enterprisecompute.com</code>).</p>
            </div>

            <div className="docs-note">
              <h4>Note on Session Security</h4>
              <p>Sessions are valid for 24 hours. After this period, or upon explicit logout, you will need to re-authenticate.</p>
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
            <p>We integrate with Paystack for secure, automated subscription management.</p>
            
            <div className="docs-step">
              <h4>Initiating Payment</h4>
              <p>When choosing a plan or upgrading, the Paystack checkout modal will appear.</p>
            </div>

            <div className="docs-step">
              <h4>Verification</h4>
              <p>Upon success, Paystack sends a webhook to our server. Your license is updated instantly, and a receipt is generated in your billing history.</p>
            </div>

            <div className="docs-note">
              <h4>Auto-Renewal</h4>
              <p>Recurring billing can be toggled in the Billing Settings. Ensure your card has sufficient balance 24 hours before expiry.</p>
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
              <p>We provide a "Standard COA Template" that you can import with one click to save time.</p>
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
              </tbody>
            </table>
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
            <p>Map your operational activities (like Payroll payments or Inventory adjustments) to specific Expense and Asset accounts to ensure your Balance Sheet is always accurate.</p>
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
