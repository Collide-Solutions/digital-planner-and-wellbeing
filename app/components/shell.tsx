'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useRouter } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { useEffect, useMemo, useState } from 'react';
import { Bell, CalendarDays, CheckSquare, Home, ListChecks, LogOut, Megaphone, UserCircle2, Sparkles } from 'lucide-react';
import { ShiftClock } from './shift-clock';

const desktopNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/requests', label: 'Requests', icon: ListChecks },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/leave', label: 'Calendar', icon: CalendarDays }
];

const mobileNavItems = [
  { href: '/dashboard', label: 'Today', icon: Home },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { href: '/requests', label: 'Requests', icon: ListChecks },
  { href: '/announcements', label: 'Announcements', icon: Megaphone },
  { href: '/leave', label: 'Calendar', icon: CalendarDays }
];

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; message: string; read: boolean; createdAt: string; type?: string | null; entityId?: string | null; entityType?: string | null }>>([]);
  const [openNotifications, setOpenNotifications] = useState(false);
  const active = (href: string) => pathname === href;
  const unreadCount = useMemo(() => notifications.filter((item) => !item.read).length, [notifications]);
  const groupedNotifications = useMemo(() => {
    return notifications.slice(0, 10).reduce<Record<string, typeof notifications>>((groups, item) => {
      const key = item.type || 'updates';
      groups[key] = groups[key] || [];
      groups[key].push(item);
      return groups;
    }, {});
  }, [notifications]);
  const isAuthRoute = pathname.startsWith('/auth');

  useEffect(() => {
    if (status !== 'authenticated') return;
    const load = async () => {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
      }
    };
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [status]);

  const markNotificationsRead = async () => {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all: true })
    });
    setNotifications((items) => items.map((item) => ({ ...item, read: true })));
  };

  if (isAuthRoute || status !== 'authenticated') return <>{children}</>;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Ambient purple glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.08] dark:opacity-[0.08] blur-[120px]" style={{ backgroundColor: 'var(--purple-bright)' }} />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full opacity-[0.06] dark:opacity-[0.06] blur-[100px]" style={{ backgroundColor: 'var(--purple-primary)' }} />
        <div className="absolute top-[40%] right-[20%] w-[30%] h-[30%] rounded-full opacity-[0.04] dark:opacity-[0.04] blur-[80px]" style={{ backgroundColor: 'var(--purple-primary)' }} />
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(168,85,247,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(168,85,247,0.3) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
      </div>

      {/* Frosted glass navbar */}
      <header className="sticky top-0 z-50 glass-nav">
        <div className="relative mx-auto flex max-w-[1720px] items-center justify-between gap-6 px-6 py-3 lg:px-8">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7C3AED] to-[#A855F7] text-white font-bold text-lg shadow-[0_0_20px_rgba(168,85,247,0.3)] group-hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] transition-all duration-300">
              <Sparkles size={20} />
            </span>
            <span className="hidden text-base font-semibold tracking-tight min-[1400px]:block" style={{ color: 'var(--text-primary)' }}>
              Digital<span style={{ color: 'var(--purple-bright)' }}>Planner</span>
            </span>
          </Link>

          {/* Shift clock + Navigation */}
          <div className="hidden items-center gap-6 md:flex">
            <div className="hidden min-[1200px]:block">
              <ShiftClock />
            </div>

            <nav className="flex items-center gap-1.5 rounded-2xl p-1.5 border" style={{ backgroundColor: 'color-mix(in srgb, var(--panel-bg) 50%, transparent)', borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)' }}>
              {desktopNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = active(item.href);
                return (
                  <Link
                    key={`${item.href}-${item.label}`}
                    href={item.href}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2 text-sm font-medium transition-all duration-300 ${
                      isActive ? 'nav-item-active' : 'nav-item'
                    }`}
                  >
                    <Icon size={16} className={isActive ? 'text-white' : ''} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right side controls */}
          <div className="hidden items-center justify-end gap-3 md:flex">
            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setOpenNotifications((value) => !value)}
                className="relative rounded-xl border p-2.5 transition-all duration-300" 
                style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)', color: 'var(--text-muted)' }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; e.currentTarget.style.backgroundColor = 'rgba(168,85,247,0.08)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--panel-bg) 60%, transparent)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                aria-label="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#FF4D9D] to-[#A855F7] text-[9px] font-bold text-white shadow-[0_0_12px_rgba(168,85,247,0.5)]">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              {openNotifications && (
                <div className="absolute right-0 mt-3 w-80 rounded-2xl glass-panel p-3 z-50">
                  <div className="flex items-center justify-between px-2 py-2">
                    <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Notifications</p>
                    <button onClick={markNotificationsRead} className="text-xs font-medium transition-colors" style={{ color: 'var(--purple-bright)' }} onMouseEnter={(e) => e.currentTarget.style.color = 'var(--purple-soft)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--purple-bright)'}>
                      Mark read
                    </button>
                  </div>
                  <div className="max-h-80 space-y-2 overflow-auto">
                    {notifications.length === 0 ? (
                      <p className="rounded-xl p-4 text-sm" style={{ backgroundColor: 'color-mix(in srgb, var(--card-bg) 80%, transparent)', color: 'var(--text-muted)' }}>No notifications yet.</p>
                    ) : (
                      Object.entries(groupedNotifications).map(([group, items]) => (
                        <div key={group} className="space-y-2">
                          <p className="px-1 text-[10px] font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--purple-bright)' }}>{group.replace(/_/g, ' ')}</p>
                          {items.map((item) => (
                            <button
                              key={item.id}
                              onClick={() => {
                                const entityType = item.entityType;
                                if (entityType === 'task') router.push('/tasks');
                                else if (entityType === 'request') router.push('/requests');
                                setOpenNotifications(false);
                              }}
                              className={`block w-full rounded-xl border p-3 text-left transition-all duration-200`}
                              style={{
                                borderColor: item.read ? 'color-mix(in srgb, var(--glass-border) 50%, transparent)' : 'color-mix(in srgb, var(--glass-border) 150%, transparent)',
                                backgroundColor: item.read ? 'transparent' : 'color-mix(in srgb, var(--purple-bright) 6%, transparent)'
                              }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(168,85,247,0.06)'; }}
                            >
                              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                              <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>{item.message}</p>
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* User profile */}
            <div className="inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-300" style={{ borderColor: 'var(--glass-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 60%, transparent)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(168,85,247,0.3)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--glass-border)'; }}>
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#7C3AED] to-[#A855F7] shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <UserCircle2 size={16} className="text-white" />
              </div>
              <span className="max-w-24 truncate text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{session?.user?.name ?? 'Member'}</span>
            </div>

            {/* Logout */}
            <button
              type="button"
              onClick={() => signOut()}
              className="inline-flex items-center gap-2 rounded-xl border bg-transparent px-3.5 py-2.5 text-sm font-medium transition-all duration-300" 
              style={{ borderColor: 'color-mix(in srgb, var(--glass-border) 50%, transparent)', color: 'var(--text-muted)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,77,157,0.3)'; e.currentTarget.style.backgroundColor = 'rgba(255,77,157,0.08)'; e.currentTarget.style.color = '#FF4D9D'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--glass-border) 50%, transparent)'; e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              <LogOut size={16} />
              <span className="hidden min-[900px]:inline">Logout</span>
            </button>
          </div>

          {/* Mobile logout */}
          <button type="button" onClick={() => signOut()} className="inline-flex items-center gap-1.5 rounded-xl border border-[rgba(255,77,157,0.2)] px-3 py-2 text-xs font-semibold text-[#FF4D9D] md:hidden">
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 mx-auto max-w-[1720px] px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        {children}
      </main>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-50 border-t p-2 sm:hidden" style={{ borderColor: 'var(--nav-border)', backgroundColor: 'color-mix(in srgb, var(--panel-bg) 92%, transparent)', backdropFilter: 'blur(20px)' }}>
        <div className="flex items-center justify-between gap-1">
          {mobileNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = active(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-1 flex-col items-center justify-center gap-1 rounded-xl px-2 py-1.5 text-[10px] font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-[#7C3AED] to-[#A855F7] text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]'
                    : 'hover:bg-[rgba(168,85,247,0.06)]' 
                }`}
                style={!isActive ? { color: 'var(--text-muted)' } : undefined}
              >
                <Icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}