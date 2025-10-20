**Stitch UI/UX Design Prompt - Desktop Task Management Application**

**Overall Design System:**
- **Layout Framework**: Consistent three-section layout across all screens
  - Top: Navigation bar (fixed position)
  - Middle: Main content area (dynamic)
  - Bottom: Log stream output (collapsible)
  - Left: Sidebar (fixed width)
- **Color Scheme**: Dark theme primary (#121212 background, #1E1E1E surfaces)
- **Accent Color**: Blue gradient (#4F46E5 to #7C3AED)
- **Typography**: Inter font family (16px base size)
- **Spacing**: 8px grid system, 16px padding standard

---

**1. Main Navigation Bar**
"Design a top navigation bar with left-aligned main menu items: [Home] [Marketplace] [User Profile]. Right-align user authentication section showing either:
- Default state: 'Sign Up' and 'Login' buttons (outline style)
- Authenticated state: User avatar with username, free credit balance (displayed as badge), and premium credit balance. Include dropdown menu for profile access
- Interactive states with smooth hover transitions (scale: 1.05) and subtle glow effects"

---

**2. Home Screen - Task Dashboard**
"Create a main content area displaying task cards in a responsive grid (3 columns desktop). Each card should show:
- Task name (truncated with tooltip)
- Installation date (YYMMDD format) with calendar icon
- Execution count with play icon
- Status indicator (color-coded: green/running, blue/idle, red/error)
- Last execution date (YYMMDD format) with clock icon
- Context menu button (kebab icon) for actions
Include a persistent 'Add New Task' FAB button in bottom-right corner with pulsating animation"

---

**3. Marketplace Interface**
"Design a marketplace grid layout showing available runner tasks with:
- Task cards featuring placeholder icons/thumbnails
- Developer name with verification badge
- Update date (YYMMDD) with refresh icon
- Version number with tag style
- 'Details' button that triggers modal overlay
Modal view should expand to show:
- Full task description with markdown support
- User manual section with accordion expanders
- Screenshot carousel
- 'Install' CTA button with size indicator"

---

**4. User Profile System**
"Create right-aligned user section with:
- Avatar initial circle with gradient background
- Credit display: Free (bold) / Premium (subtle)
- Dropdown menu containing:
  - Account email
  - Credit breakdown progress bars
  - Transaction history table (amount, date, type)
  - Payment method management
  - Logout option
Design recharge modal with:
- Credit package options (3-tier pricing)
- Payment gateway integration placeholder
- Transaction confirmation dialog"

---

**5. Left Sidebar Components**
"Fixed left sidebar with:
- **Manual Section**: Document icon with expandable content showing:
  - PowerShell permissions guide (step-numbered list)
  - Python/Node.js installation instructions (toggle sections)
  - Embedded video player placeholder for demos
- **Blog Section**: News icon displaying:
  - Scrollable news feed cards
  - Date-stamped entries with category tags
  - 'Read More' expansion capability
- **Support Section**: Fixed bottom element with:
  - WeChat QR code placeholder (tooltip on hover)
  - Email contact button (mailto: trigger)
  - Support hours indicator"

---

**6. Log Stream Output**
"Design bottom panel with:
- Fixed height (30% viewport) with drag-to-resize handle
- PowerShell-style terminal emulator (black background, green text)
- Non-editable text area with auto-scrolling
- Control bar containing:
  - Clear button (trash icon)
  - Export button (download icon) triggering save dialog
  - Pause/Resume toggle
  - Timestamp toggle
- Error highlighting (red text for errors, yellow for warnings)"

---

**7. Interactive States & Micro-interactions**
"Implement throughout:
- Smooth page transitions (fade-in/out)
- Hover effects on all interactive elements (lift effect + glow)
- Loading states: skeleton screens for content loading
- Success/error toast notifications
- Drag-and-drop functionality for task reordering
- Keyboard shortcut indicators (tooltips)"

---

**8. Responsive Considerations**
"Ensure layout maintains:
- Collapsible sidebar (hamburger menu on <1200px width)
- Stackable grid cards on tablet breakpoints
- Preserved log visibility on all screen sizes
- Touch-friendly targets for hybrid devices"


主页界面

https://miaoduo.com/file/8umu6qKkuY8e4SQ0OBMFF4K?nodeId=407%3A1&type=design
