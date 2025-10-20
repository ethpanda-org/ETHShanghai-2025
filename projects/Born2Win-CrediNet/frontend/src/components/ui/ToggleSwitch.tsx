interface ToggleSwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
  label?: string
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  disabled = false,
  label
}) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      {label && <span className="text-sm text-gray-300">{label}</span>}
      <div className="toggle-switch">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="toggle-slider" />
      </div>
    </label>
  )
}

export default ToggleSwitch

