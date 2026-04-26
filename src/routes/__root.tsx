import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import { I18nProvider } from "@/components/I18nProvider";
import { Toaster } from "@/components/ui/sonner";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Хуудас олдсонгүй</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Таны хайсан хуудас байхгүй эсвэл шилжсэн байна.
        </p>
        <div className="mt-6">
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Нүүр хуудас руу буцах
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Гэр Олох — Солонгос дахь Монголчуудын байрны самбар" },
      {
        name: "description",
        content:
          "Сөүл, Инчон, Кёнги, Бусан болон бусад бүсийн байр түрээсийн самбар. Монгол хэл дээр, шууд эзэнтэй нь холбогдоорой.",
      },
      { property: "og:title", content: "Гэр Олох — Солонгост байр түрээс" },
      { property: "og:description", content: "Солонгос дахь Монголчуудад зориулсан байрны самбар." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="mn">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <I18nProvider>
      <Outlet />
      <Toaster position="top-center" />
    </I18nProvider>
  );
}
