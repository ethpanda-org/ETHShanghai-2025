import { createBrowserRouter } from "react-router-dom";
import App from "@/App";
import HomePage from "@/pages/HomePage";
import LoginPage from "@/pages/LoginPage";
import MyPage from "@/pages/MyPage";
import PagePlaceholder from "@/pages/PagePlaceholder";
import QuestAskPage from "@/pages/QuestAskPage";
import SignupPage from "@/pages/SignupPage";
import FAQPage from "@/pages/FAQPage";

const routes = [
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "products",
        element: (
          <PagePlaceholder
            title="Products"
            description="Outline your product offerings or link out to key product landing pages."
          />
        ),
      },
      {
        path: "products/blog",
        element: (
          <PagePlaceholder
            title="Product Blog"
            description="Share long-form updates about your products."
          />
        ),
      },
      {
        path: "products/company",
        element: (
          <PagePlaceholder
            title="Company"
            description="Tell the story of your team and mission."
          />
        ),
      },
      {
        path: "products/careers",
        element: (
          <PagePlaceholder
            title="Careers"
            description="Highlight open roles and your hiring process."
          />
        ),
      },
      {
        path: "products/support",
        element: (
          <PagePlaceholder
            title="Support"
            description="Provide documentation, FAQs, or raise a support ticket."
          />
        ),
      },
      {
        path: "resources",
        element: (
          <PagePlaceholder
            title="Resources"
            description="Collect helpful guides, downloads, or tools."
          />
        ),
      },
      {
        path: "resources/help-center",
        element: (
          <PagePlaceholder
            title="Help Center"
            description="Curate articles that help users solve common issues."
          />
        ),
      },
      {
        path: "resources/contact",
        element: (
          <PagePlaceholder
            title="Contact Us"
            description="Offer direct contact details or a form."
          />
        ),
      },
      {
        path: "resources/status",
        element: (
          <PagePlaceholder
            title="Service Status"
            description="Communicate current system uptime and incident history."
          />
        ),
      },
      {
        path: "resources/terms",
        element: (
          <PagePlaceholder
            title="Terms of Service"
            description="Publish your legal terms, privacy policy, and compliance docs."
          />
        ),
      },
      {
        path: "quest",
        element: <QuestAskPage />,
      },
      {
        path: "faq",
        element: <FAQPage />,
      },
      {
        path: "login",
        element: <LoginPage />,
      },
      {
        path: "my",
        element: <MyPage />,
      },
      {
        path: "signup",
        element: <SignupPage />,
      },
      {
        path: "*",
        element: (
          <PagePlaceholder
            title="Page Not Found"
            description="The page you are looking for does not exist."
          />
        ),
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
export default router;
