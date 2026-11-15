export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui", margin: 0 }}>
        <header style={{ padding: 12, background: "#eee" }}>header</header>
        {/* The probe watches this column: it should never be empty after a navigation. */}
        <main id="content">{children}</main>
      </body>
    </html>
  );
}
