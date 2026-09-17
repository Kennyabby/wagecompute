// The real Epsilon brand mark — the same slanted serif "ε" used by the
// actual chat launcher (Components/Epsilon/Epsilon.css .epsilon-mark), not a
// generic AI/robot icon. Mimics the react-icons component API (size/color
// props) so it drops into MODULE_ICONS and renders correctly anywhere an
// icon component is expected — module pickers, nav menus, marketing pages.
const EpsilonMark = ({ size = '1em', color = 'currentColor', style, ...rest }) => (
  <span
    aria-label="Epsilon AI"
    style={{
      display: 'inline-block',
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1,
      color,
      transform: 'rotate(-14deg) scale(1.15)',
      userSelect: 'none',
      ...style,
    }}
    {...rest}
  >
    ε
  </span>
)

export default EpsilonMark
