import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Home, Package, ShoppingCart, Factory, Truck, Settings, ChevronDown, LogOut, Bell, CalendarClock, CircleDashed, AlertTriangle, Warehouse, Sparkles } from 'lucide-react';
import api from '../api';
import { Button } from './ui/Button';
import { Avatar, AvatarImage, AvatarFallback } from './ui/Avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/DropdownMenu';
import { cn } from '@/lib/utils';

function BrandMark({ compact = false }) {
  return (
    <div className={cn(
      'flex items-center gap-3',
      compact && 'justify-center'
    )}>
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 via-sky-500 to-cyan-400 shadow-lg shadow-blue-500/30 ring-1 ring-white/20">
        <span className="text-lg font-black text-white">M</span>
      </div>
      {!compact && (
        <div>
          <div className="text-lg font-bold tracking-tight text-white">MMestry</div>
          <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-slate-300">ERP</div>
        </div>
      )}
    </div>
  );
}

export default function ERPLayout({ children, user }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [nearestDeadline, setNearestDeadline] = useState(null);
  const location = useLocation();

  const navigationItems = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Inventory', href: '/inventory', icon: Package },
    { name: 'Orders', href: '/customer-orders', icon: ShoppingCart },
    { name: 'Production', href: '/production', icon: Factory },
    { name: 'Dispatch', href: '/dispatch', icon: Truck },
    ...(user?.role === 'ADMIN' ? [{ name: 'Admin Settings', href: '/admin/management', icon: Settings }] : []),
  ];

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const [ordersRes, inventoryRes] = await Promise.all([
          api.get('/api/customer-orders/?page_size=1000'),
          api.get('/api/inventory/')
        ]);

        const orders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data?.results || [];
        const inventory = Array.isArray(inventoryRes.data) ? inventoryRes.data : inventoryRes.data?.results || [];

        const nextAlerts = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const activeOrders = orders.filter((order) => (
          order.deadline && !['DISPATCHED', 'CLOSED'].includes(order.status)
        ));
        const datedOrders = activeOrders
          .map((order) => ({ ...order, deadlineDate: new Date(`${order.deadline}T00:00:00`) }))
          .filter((order) => !Number.isNaN(order.deadlineDate.getTime()));
        const upcomingOrders = datedOrders.filter((order) => order.deadlineDate >= today);
        const nearestOrder = (upcomingOrders.length ? upcomingOrders : datedOrders)
          .sort((a, b) => a.deadlineDate - b.deadlineDate)[0];
        setNearestDeadline(nearestOrder?.deadlineDate || null);

        orders.forEach((order) => {
          if (!order.deadline || ['DISPATCHED', 'CLOSED'].includes(order.status)) return;

          const deadline = new Date(order.deadline);
          deadline.setHours(0, 0, 0, 0);
          const diffTime = deadline.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 7) {
            nextAlerts.push({
              id: `order-${order.id}`,
              type: 'deadline',
              title: order.po_number || `Order #${order.id}`,
              subtitle: `${order.client_name || 'Customer'} • ${order.part_name || 'Part'} • ${order.status}`,
              meta: diffDays < 0 ? `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} overdue` : diffDays === 0 ? 'Due today' : `Due in ${diffDays} day${diffDays === 1 ? '' : 's'}`,
              severity: diffDays < 0 ? 'overdue' : diffDays <= 3 ? 'critical' : 'warning',
              timestamp: deadline,
            });
          }
        });

        inventory.forEach((item) => {
          const available = Number(item.available_blanks ?? 0);
          const total = Number(item.total_blanks ?? 0);
          if (available <= 10 || total <= 10) {
            nextAlerts.push({
              id: `stock-${item.id}`,
              type: 'stock',
              title: `${item.part_name || 'Part'} is running low`,
              subtitle: `${item.company_name || 'Company'} • available ${available} / total ${total}`,
              meta: available <= 0 ? 'Out of stock' : `${available} remaining`,
              severity: available <= 0 ? 'critical' : 'warning',
              timestamp: new Date(item.last_adjusted_at || Date.now()),
            });
          }
        });

        nextAlerts.sort((a, b) => {
          const severityWeight = { critical: 0, overdue: 1, warning: 2 };
          return (severityWeight[a.severity] ?? 99) - (severityWeight[b.severity] ?? 99) || new Date(a.timestamp) - new Date(b.timestamp);
        });

        setNotifications(nextAlerts.slice(0, 8));
      } catch (error) {
        console.error('Failed to load ERP notifications', error);
      }
    };

    fetchNotifications();
  }, []);

  const notificationCount = notifications.length;

  const isActive = (href) => {
    if (href === '/' && location.pathname === '/') return true;
    if (href !== '/' && location.pathname.startsWith(href)) return true;
    return false;
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      <aside
        className={cn(
          'bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out flex flex-col',
          sidebarOpen ? 'w-64' : 'w-20'
        )}
      >
        <div className="h-16 border-b border-slate-700 flex items-center justify-between px-4">
          {sidebarOpen && <BrandMark />}
          {!sidebarOpen && <BrandMark compact />}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors text-white"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200',
                  active
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-600/20'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                )}
                title={!sidebarOpen ? item.name : undefined}
              >
                <Icon size={20} className="flex-shrink-0" />
                {sidebarOpen && <span>{item.name}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-700 p-3 space-y-3">
          {user && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-800/70 p-2.5">
              <Avatar className="h-10 w-10 border border-slate-600">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.username}`} />
                <AvatarFallback>{user.username.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              {sidebarOpen && (
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.username}</p>
                  <p className="text-xs text-slate-400 truncate">{user.role}</p>
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-200 transition hover:border-red-500/60 hover:bg-red-500/10 hover:text-red-300',
              !sidebarOpen && 'justify-center px-2'
            )}
          >
            <LogOut size={16} />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 via-sky-500 to-cyan-400 text-lg font-black text-white shadow-lg shadow-blue-500/20">
              M
            </div>
            <h2 className="text-2xl font-bold text-slate-900">
              {navigationItems.find((item) => isActive(item.href))?.name || 'Dashboard'}
            </h2>
            <div className="ml-2 flex items-center gap-1 bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
              <span className="inline-flex h-2 w-2 rounded-full bg-green-600 animate-pulse"></span>
              Live
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 shadow-sm">
              <CalendarClock size={16} className="text-amber-600" />
              <span className="font-medium">Nearest Deadline</span>
              <span className="font-semibold">
                {nearestDeadline ? nearestDeadline.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'No active deadline'}
              </span>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="relative rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Notifications"
                >
                  <Bell size={18} />
                  {notificationCount > 0 && (
                    <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel className="flex items-center justify-between">
                  <span>Notifications</span>
                  <span className="text-xs text-slate-400">{notificationCount}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />

                {notificationCount === 0 ? (
                  <div className="px-4 py-5 text-sm text-slate-400">No low-stock alerts or deadlines right now.</div>
                ) : (
                  notifications.map((item) => (
                    <DropdownMenuItem key={item.id} className="flex items-start gap-3 py-3" asChild>
                      <Link to={item.type === 'stock' ? '/inventory' : '/customer-orders'} className="w-full cursor-pointer">
                        <div className="mt-0.5 flex-shrink-0">
                          {item.type === 'stock' ? (
                            <AlertTriangle size={16} className="text-amber-500" />
                          ) : (
                            <CalendarClock size={16} className="text-blue-500" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium text-slate-900">{item.title}</div>
                          <div className="text-xs text-slate-500">{item.subtitle}</div>
                          <div className={cn(
                            'mt-1 text-[11px] font-medium',
                            item.severity === 'critical' ? 'text-red-600' : 'text-amber-600'
                          )}>{item.meta}</div>
                        </div>
                      </Link>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 hover:bg-slate-100">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`} />
                    <AvatarFallback>{user?.username?.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline">{user?.username}</span>
                  <ChevronDown size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username}</p>
                    <p className="text-xs leading-none text-slate-500">{user?.role}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/" className="cursor-pointer">
                    <Home size={16} className="mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut size={16} className="mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
