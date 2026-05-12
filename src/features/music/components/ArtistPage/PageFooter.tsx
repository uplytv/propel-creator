interface Props { displayName: string; showPoweredBy?: boolean }
export default function PageFooter({ displayName, showPoweredBy }: Props) {
  return (
    <footer className="text-center py-12 text-sm px-6" style={{ color: 'var(--text-muted)' }}>
      {showPoweredBy && (
        <div className="mb-3">
          Powered by{' '}
          <a
            href="https://uply.tv"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold bg-clip-text text-transparent"
            style={{ backgroundImage: 'linear-gradient(90deg, var(--accent), var(--accent-2))' }}
          >
            UPLY
          </a>
        </div>
      )}
      <div>© {new Date().getFullYear()} {displayName}</div>
    </footer>
  );
}
