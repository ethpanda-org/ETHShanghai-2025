import { useState, useRef, useEffect } from "react";
import { Loader2, Menu,User, LogOut, ChevronDown } from "lucide-react";
import { Link, NavLink } from "react-router-dom";
import alphaBuilderLogo from "@/assets/alphabuilder-logo.svg";
import { cn } from "@/lib/utils";
import { useEmailAuth } from "@/hooks/useEmailAuth";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

interface MenuItem {
  title: string;
  url: string;
  description?: string;
  icon?: React.ReactNode;
  items?: MenuItem[];
}

interface NavbarProps {
  logo?: {
    url: string;
    src: string;
    alt: string;
    title: string;
  };
  menu?: MenuItem[];
  auth?: {
    login: {
      title: string;
      url: string;
    };
    signup: {
      title: string;
      url: string;
    };
  };
}

const shortenAddress = (address: string) => {
  if (address.length <= 12) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

const Navbar = ({
  logo = {
    url: "/",
    src: alphaBuilderLogo,
    alt: "logo",
    title: "AlphaBuilder",
  },
  menu = [
    { title: "Home", url: "/" },
    // {
    //   title: "Products",
    //   url: "/products",
    //   items: [
    //     {
    //       title: "Blog",
    //       description: "The latest industry news, updates, and info",
    //       icon: <Book className="size-5 shrink-0" />,
    //       url: "/products/blog",
    //     },
    //     {
    //       title: "Company",
    //       description: "Our mission is to innovate and empower the world",
    //       icon: <Trees className="size-5 shrink-0" />,
    //       url: "/products/company",
    //     },
    //     {
    //       title: "Careers",
    //       description: "Browse job listing and discover our workspace",
    //       icon: <Sunset className="size-5 shrink-0" />,
    //       url: "/products/careers",
    //     },
    //     {
    //       title: "Support",
    //       description:
    //         "Get in touch with our support team or visit our community forums",
    //       icon: <Zap className="size-5 shrink-0" />,
    //       url: "/products/support",
    //     },
    //   ],
    // },
    // {
    //   title: "Resources",
    //   url: "/resources",
    //   items: [
    //     {
    //       title: "Help Center",
    //       description: "Get all the answers you need right here",
    //       icon: <Zap className="size-5 shrink-0" />,
    //       url: "/resources/help-center",
    //     },
    //     {
    //       title: "Contact Us",
    //       description: "We are here to help you with any questions you have",
    //       icon: <Sunset className="size-5 shrink-0" />,
    //       url: "/resources/contact",
    //     },
    //     {
    //       title: "Status",
    //       description: "Check the current status of our services and APIs",
    //       icon: <Trees className="size-5 shrink-0" />,
    //       url: "/resources/status",
    //     },
    //     {
    //       title: "Terms of Service",
    //       description: "Our terms and conditions for using our services",
    //       icon: <Book className="size-5 shrink-0" />,
    //       url: "/resources/terms",
    //     },
    //   ],
    // },
    {
      title: "Quest",
      url: "/quest",
    },
    {
      title: "FAQ",
      url: "/faq",
    },
  ],
  auth = {
    login: { title: "Login", url: "/login" },
    signup: { title: "Sign up", url: "/signup" },
  },
}: NavbarProps) => {
  const { user, status, isLoading, logout, walletAddress } = useEmailAuth();
  const isAuthenticated = status === "authenticated" && !!user;
  const loginLabel = isLoading ? (
    <>
      <Loader2 className="mr-2 size-4 animate-spin" />
      Loading...
    </>
  ) : (
    auth.login.title
  );
  const signupLabel = auth.signup.title;

  const renderAuthControls = (layout: "row" | "column") => {
    const containerClass = cn(
      "flex gap-2",
      layout === "column" ? "flex-col" : "items-center"
    );

    if (isAuthenticated && user) {
      const walletLabel = walletAddress
        ? shortenAddress(walletAddress)
        : "Provisioning wallet...";
      
      if (layout === "column") {
        // Mobile layout - keep the original design
        return (
          <div className={containerClass}>
            <Link
              to="/my"
              className={cn(
                "rounded-md border border-border bg-muted/60 px-3 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                "hover:bg-muted hover:border-ring/60",
                "w-full text-left"
              )}
            >
              <div className="font-medium">{user.email}</div>
              <div className="font-mono text-xs text-muted-foreground">
                {walletLabel}
              </div>
            </Link>
            <Button
              variant="outline"
              onClick={logout}
              className="w-full"
            >
              Log out
            </Button>
          </div>
        );
      }

      // Desktop layout - use dropdown
      return <UserDropdown user={user} walletLabel={walletLabel} logout={logout} />;
    }

    return (
      <div className={containerClass}>
        <Button
          asChild
          variant="outline"
          size="default"
          disabled={isLoading}
          className={layout === "column" ? "w-full" : undefined}
        >
          <Link to={auth.login.url} className="flex items-center">
            {loginLabel}
          </Link>
        </Button>
        <Button
          asChild
          size="default"
          disabled={isLoading}
          className={layout === "column" ? "w-full" : undefined}
        >
          <Link to={auth.signup.url}>{signupLabel}</Link>
        </Button>
      </div>
    );
  };

  return (
    <section className="py-4">
      <div className="container">
        {/* Desktop Menu */}
        <nav className="hidden justify-between lg:flex">
          <div className="flex items-center gap-6">
            {/* Logo */}
            <Link to={logo.url} className="flex items-center gap-2">
              <img
                src={logo.src}
                className="max-h-8 dark:invert"
                alt={logo.alt}
              />
              <span className="text-xl font-semibold tracking-tighter">
                {logo.title}
              </span>
            </Link>
            <div className="flex items-center">
              <NavigationMenu>
                <NavigationMenuList>
                  {menu.map((item) => renderMenuItem(item))}
                </NavigationMenuList>
              </NavigationMenu>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {renderAuthControls("row")}
          </div>
        </nav>

        {/* Mobile Menu */}
        <div className="block lg:hidden">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to={logo.url} className="flex items-center gap-2">
              <img
                src={logo.src}
                className="max-h-8 dark:invert"
                alt={logo.alt}
              />
            </Link>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon">
                  <Menu className="size-4" />
                </Button>
              </SheetTrigger>
              <SheetContent className="overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>
                    <Link to={logo.url} className="flex items-center gap-2">
                      <img
                        src={logo.src}
                        className="max-h-8 dark:invert"
                        alt={logo.alt}
                      />
                    </Link>
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col gap-6 p-4">
                  <Accordion
                    type="single"
                    collapsible
                    className="flex w-full flex-col gap-4"
                  >
                    {menu.map((item) => renderMobileMenuItem(item))}
                  </Accordion>

                  <div className="flex flex-col gap-2">
                    {renderAuthControls("column")}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </section>
  );
};

const renderMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <NavigationMenuItem key={item.title}>
        <NavigationMenuTrigger className="text-lg">
          {item.title}
        </NavigationMenuTrigger>
        <NavigationMenuContent className="bg-popover text-popover-foreground">
          {item.items.map((subItem) => (
            <NavigationMenuLink asChild key={subItem.title} className="w-80">
              <SubMenuLink item={subItem} />
            </NavigationMenuLink>
          ))}
        </NavigationMenuContent>
      </NavigationMenuItem>
    );
  }

  return (
    <NavigationMenuItem key={item.title}>
      <NavigationMenuLink asChild>
        <NavLink
          to={item.url}
          className={({ isActive }) =>
            cn(
              "group inline-flex h-10 w-max items-center justify-center rounded-md px-4 py-2 text-xl font-medium transition-colors",
              "bg-background hover:bg-muted hover:text-accent-foreground",
              isActive && "bg-muted text-accent-foreground"
            )
          }
        >
          {item.title}
        </NavLink>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
};

const renderMobileMenuItem = (item: MenuItem) => {
  if (item.items) {
    return (
      <AccordionItem key={item.title} value={item.title} className="border-b-0">
        <AccordionTrigger className="text-md py-0 font-semibold hover:no-underline">
          {item.title}
        </AccordionTrigger>
        <AccordionContent className="mt-2">
          {item.items.map((subItem) => (
            <SubMenuLink key={subItem.title} item={subItem} />
          ))}
        </AccordionContent>
      </AccordionItem>
    );
  }

  return (
    <NavLink
      key={item.title}
      to={item.url}
      className={({ isActive }) =>
        cn(
          "text-lg font-semibold",
          isActive ? "text-primary" : "text-foreground"
        )
      }
    >
      {item.title}
    </NavLink>
  );
};

const SubMenuLink = ({ item }: { item: MenuItem }) => {
  return (
    <NavLink
      to={item.url}
      className={({ isActive }) =>
        cn(
          "flex min-w-80 select-none flex-row gap-4 rounded-md p-3 leading-none no-underline outline-none transition-colors",
          "hover:bg-muted hover:text-accent-foreground",
          isActive && "bg-muted text-accent-foreground"
        )
      }
    >
      <div className="text-foreground">{item.icon}</div>
      <div>
        <div className="text-base font-semibold">{item.title}</div>
        {item.description && (
          <p className="text-muted-foreground text-sm leading-snug">
            {item.description}
          </p>
        )}
      </div>
    </NavLink>
  );
};

const UserDropdown = ({ 
  user, 
  walletLabel, 
  logout 
}: { 
  user: { email: string }; 
  walletLabel: string; 
  logout: () => void; 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-2 rounded-md border border-border bg-muted/60 px-3 py-2 text-sm transition-colors",
          "hover:bg-muted hover:border-ring/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          "min-w-[12rem] text-left"
        )}
      >
        <div className="flex-1">
          <div className="font-medium">{user.email}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {walletLabel}
          </div>
        </div>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-border bg-background shadow-lg z-50">
          <div className="p-1">
            <Link
              to="/my"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Account</span>
            </Link>
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors w-full text-left"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export { Navbar };
