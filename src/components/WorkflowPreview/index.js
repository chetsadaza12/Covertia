import React, { useState, useRef, useCallback, useEffect } from 'react';
import styles from './styles.module.css';

const BLOCK_ICONS = {
  'riPlayLine': { emoji: '▶', color: '#ffffff', bgColor: '#2ea043' },
  'riDatabase2Line': { emoji: '🗄', color: '#ffffff', bgColor: '#8b5cf6' },
  'riGlobalLine': { emoji: '🔗', color: '#ffffff', bgColor: '#8b5cf6' },
  'riLink': { emoji: '🔗', color: '#ffffff', bgColor: '#8b5cf6' },
  'riStopLine': { emoji: '⏹', color: '#ffffff', bgColor: '#f85149' },
  'riCursorLine': { emoji: '↖', color: '#ffffff', bgColor: '#3b82f6' },
  'riKeyboardLine': { emoji: '⌨', color: '#ffffff', bgColor: '#3b82f6' },
  'default': { emoji: '⚙', color: '#ffffff', bgColor: '#58a6ff' },
};

const LABEL_MAP = {
  'trigger': 'Start',
  'insert-data': 'Insert Data',
  'end': 'End',
  'open-url': 'Open URL',
  'click-element': 'Mouse Click',
  'click': 'Mouse Click',
  'event-click': 'Mouse Click',
  'get-text': 'Get Text',
  'forms': 'Input Text',
  'input-text': 'Input Text',
  'press-key': 'Presskey',
  'presskey': 'Presskey',
  'wait': 'Wait',
  'loop': 'Loop',
  'conditions': 'Conditions',
  'javascript-code': 'JavaScript',
  'take-screenshot': 'Screenshot',
};

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 60;
const PORT_RADIUS = 8;

function getIcon(iconKey) {
  return BLOCK_ICONS[iconKey] || BLOCK_ICONS['default'];
}

function getLabel(label) {
  return LABEL_MAP[label] || label.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/* Bezier connection line */
function ConnectionLine({ id, x1, y1, x2, y2, onDelete, isHovered, onMouseEnter, onMouseLeave, isFallback }) {
  const dx = Math.abs(x2 - x1) * 0.5;
  const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

  // Arrow point
  const arrowSize = 6;
  const midX = (x1 + x2) / 2 + (x2 - x1) * 0.15;
  const midY = (y1 + y2) / 2;
  const angle = Math.atan2(y2 - y1, x2 - x1);

  const strokeColor = isHovered ? '#f85149' : (isFallback ? '#f85149' : '#333333');
  const arrowColor = isHovered ? '#f85149' : (isFallback ? '#f85149' : '#999999');

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{ cursor: 'pointer' }}
      onClick={(e) => { e.stopPropagation(); onDelete(id); }}
    >
      {/* Wider invisible hit area */}
      <path d={d} fill="none" stroke="transparent" strokeWidth={16} />
      {/* Visible line */}
      <path
        d={d}
        fill="none"
        stroke={strokeColor}
        strokeWidth={2}
        strokeDasharray={isHovered ? '6 4' : 'none'}
        style={{ transition: 'stroke 0.15s' }}
      />
      {/* Arrow markers along the path */}
      <polygon
        points={`${midX},${midY - arrowSize / 2} ${midX + arrowSize},${midY} ${midX},${midY + arrowSize / 2}`}
        fill={arrowColor}
        transform={`rotate(${angle * 180 / Math.PI}, ${midX}, ${midY})`}
      />
      {/* Target port filled dot */}
      <circle cx={x2} cy={y2} r={4} fill={strokeColor} />
    </g>
  );
}

/* Draggable Block Node */
function BlockNode({
  node, isSelected, onClick, onDragStart, onPortDragStart,
  connectingTarget, scale, onDeleteNode
}) {
  const icon = getIcon(node.data?.icon);
  const label = getLabel(node.label);
  const isEnd = node.label === 'end';
  const isTrigger = node.label === 'trigger';
  const hasFallback = node.type === 'BlockBasicWithFallback';

  const [isHovered, setIsHovered] = useState(false);

  const handleMouseDown = (e) => {
    e.stopPropagation();
    onDragStart(node.id, e);
  };

  const handleOutputPortMouseDown = (e) => {
    e.stopPropagation();
    onPortDragStart(node.id, 'output', e);
  };

  const handleFallbackPortMouseDown = (e) => {
    e.stopPropagation();
    onPortDragStart(node.id, 'fallback', e);
  };

  const isConnectTarget = connectingTarget === node.id;

  // Validate fields for warnings
  const issues = [];
  if (node.label === 'open-url') {
    if (!node.data?.url || node.data.url.trim() === '') {
      issues.push('URL is empty');
    }
  }
  const hasIssues = issues.length > 0;

  return (
    <g
      transform={`translate(${node.position.x}, ${node.position.y})`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Delete/Trash button - only show when hovered or selected, and NOT trigger */}
      {!isTrigger && (isHovered || isSelected) && (
        <g
          className={styles.deleteBlockBtn}
          onClick={(e) => {
            e.stopPropagation();
            onDeleteNode(node.id);
          }}
          style={{ cursor: 'pointer' }}
        >
          <rect
            x={10}
            y={-32}
            width={28}
            height={28}
            rx={6}
            ry={6}
            fill="#ffffff"
            stroke="rgba(0,0,0,0.12)"
            strokeWidth={1}
          />
          <text
            x={24}
            y={-13}
            textAnchor="middle"
            fontSize={14}
            fill="#f85149"
          >
            🗑
          </text>
        </g>
      )}
      {/* Shadow */}
      <rect
        x={2} y={3}
        width={BLOCK_WIDTH} height={BLOCK_HEIGHT}
        rx={12} ry={12}
        fill="rgba(0,0,0,0.08)"
      />
      {/* Block body */}
      <rect
        x={0} y={0}
        width={BLOCK_WIDTH} height={BLOCK_HEIGHT}
        rx={12} ry={12}
        fill={isSelected ? '#f0f4ff' : '#ffffff'}
        stroke={isSelected ? '#58a6ff' : 'rgba(0,0,0,0.08)'}
        strokeWidth={isSelected ? 2 : 1}
        style={{ cursor: 'move' }}
        onMouseDown={handleMouseDown}
        onClick={(e) => { e.stopPropagation(); onClick(node); }}
      />

      {/* Icon background */}
      <rect
        x={14} y={12}
        width={36} height={36}
        rx={10} ry={10}
        fill={icon.bgColor}
        style={{ pointerEvents: 'none' }}
      />

      {/* Icon */}
      <text
        x={32} y={36}
        textAnchor="middle"
        fontSize={18}
        fill={icon.color}
        style={{ pointerEvents: 'none' }}
      >
        {icon.emoji}
      </text>

      {/* Label */}
      <text
        x={60} y={36}
        fontSize={14}
        fontWeight={600}
        fontFamily="'Inter', 'Segoe UI', system-ui, sans-serif"
        fill="#1a1a1a"
        style={{ pointerEvents: 'none' }}
      >
        {label}
      </text>

      {/* Input port (left) - acts as drop target */}
      {!isTrigger && (
        <circle
          cx={0} cy={BLOCK_HEIGHT / 2}
          r={PORT_RADIUS}
          fill={isConnectTarget ? '#58a6ff' : '#1a1a1a'}
          stroke="#ffffff"
          strokeWidth={2}
          style={{ cursor: 'crosshair', transition: 'fill 0.15s' }}
        />
      )}

      {/* Output port (right) - drag to create connection */}
      {!isEnd && (
        <circle
          cx={BLOCK_WIDTH} cy={BLOCK_HEIGHT / 2}
          r={PORT_RADIUS}
          fill="#ffffff"
          stroke="#1a1a1a"
          strokeWidth={2}
          style={{ cursor: 'crosshair' }}
          onMouseDown={handleOutputPortMouseDown}
        />
      )}

      {/* Fallback indicators & ports */}
      {hasFallback && (
        <>
          {/* Fallback output port (red port, now draggable!) */}
          <circle
            cx={BLOCK_WIDTH} cy={BLOCK_HEIGHT - 14}
            r={PORT_RADIUS}
            fill="#ffffff"
            stroke="#f85149"
            strokeWidth={2}
            style={{ cursor: 'crosshair' }}
            onMouseDown={handleFallbackPortMouseDown}
          />
        </>
      )}

      {/* Issues warning label & tooltip popup */}
      {hasIssues && (
        <g>
          {/* Warning triangle icon */}
          <g transform={`translate(${BLOCK_WIDTH - 30}, 6)`} className={styles.warningGroup}>
            <polygon
              points="8,0 16,14 0,14"
              fill="none"
              stroke="#f85149"
              strokeWidth={1.5}
            />
            <text x={8} y={11} textAnchor="middle" fontSize={9} fill="#f85149" fontWeight="bold">!</text>
          </g>
          {/* Warning issues list tooltip popover wrapper */}
          <foreignObject x={BLOCK_WIDTH - 25} y={-52} width={130} height={55} className={styles.tooltipForeign}>
            <div className={styles.issuesTooltip}>
              <strong>Issues:</strong>
              <div>• URL is empty</div>
            </div>
          </foreignObject>
        </g>
      )}
    </g>
  );
}

function PropertiesPanel({ node, onClose, onUpdate }) {
  if (!node) return null;
  const icon = getIcon(node.data?.icon);
  const label = getLabel(node.label);

  const [description, setDescription] = useState(node.data?.description || '');
  const [url, setUrl] = useState(node.data?.url || '');
  const [waitForNavigation, setWaitForNavigation] = useState(node.data?.waitForNavigation || 'domcontentloaded');
  const [delay, setDelay] = useState(node.data?.delay || 0);
  const [onErrorEnabled, setOnErrorEnabled] = useState(node.data?.waitTabLoaded || false);
  const [newTab, setNewTab] = useState(node.data?.newTab || false);
  const [activeTab, setActiveTab] = useState(node.data?.active !== false);
  const [timeout, setTimeoutVal] = useState(node.data?.timeout || 0);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Mouse Click & Input Text states
  const [selector, setSelector] = useState('');
  const [selectorType, setSelectorType] = useState('XPath');
  const [clickType, setClickType] = useState('Left click');
  const [multiple, setMultiple] = useState(false);
  const [waitForSelector, setWaitForSelector] = useState(false);
  const [humanClick, setHumanClick] = useState(false);

  // Event Click specific states
  const [clickX, setClickX] = useState('');
  const [clickY, setClickY] = useState('');
  const [findBy, setFindBy] = useState('xpath');
  const [waitSelectorTimeout, setWaitSelectorTimeout] = useState(5000);
  const [markEl, setMarkEl] = useState(false);

  // Input Text specific states
  const [getFormValue, setGetFormValue] = useState(false);
  const [inputFormat, setInputFormat] = useState('Text field');
  const [value, setValue] = useState('');
  const [typingDelay, setTypingDelay] = useState(0);
  const [clearFormValue, setClearFormValue] = useState(true);

  // Presskey states
  const [targetElement, setTargetElement] = useState('');
  const [level, setLevel] = useState('Browser');
  const [action, setAction] = useState('Press a key');
  const [key, setKey] = useState('Enter');
  const [pressTime, setPressTime] = useState(0);

  // Selector and Click dropdown states
  const [selectorTypeOpen, setSelectorTypeOpen] = useState(false);
  const [clickTypeOpen, setClickTypeOpen] = useState(false);
  const [selectorOptionsCollapsed, setSelectorOptionsCollapsed] = useState(false);
  const [levelOpen, setLevelOpen] = useState(false);
  const [actionOpen, setActionOpen] = useState(false);

  useEffect(() => {
    setDescription(node.data?.description || '');
    setUrl(node.data?.url || '');
    setWaitForNavigation(node.data?.waitForNavigation || 'domcontentloaded');
    setDelay(node.data?.delay || 0);
    setOnErrorEnabled(node.data?.waitTabLoaded || false);
    setNewTab(node.data?.newTab || false);
    setActiveTab(node.data?.active !== false);
    setTimeoutVal(node.data?.timeout || 0);

    // Click/Form Selectors
    if (node.label === 'event-click') {
      setSelector(node.data?.selector || "//input[@name='search_query']");
      const findByVal = node.data?.findBy || 'xpath';
      setSelectorType(findByVal === 'xpath' ? 'XPath' : 'CSS Selector');
      const selectOpt = node.data?.selectOption || 'leftClick';
      let ct = 'Left click';
      if (selectOpt === 'rightClick') ct = 'Right click';
      if (selectOpt === 'doubleClick') ct = 'Double click';
      setClickType(ct);
      setMultiple(node.data?.multiple || false);
      setWaitForSelector(node.data?.waitForSelector || false);
      setHumanClick(node.data?.humanClick || false);
      setTimeoutVal(node.data?.waitSelectorTimeout !== undefined ? node.data.waitSelectorTimeout : 5000);
    } else {
      setSelector(node.data?.selector || "//input[@name='search_query']");
      setSelectorType(node.data?.selectorType || "XPath");
      setClickType(node.data?.clickType || "Left click");
      setMultiple(node.data?.multiple || false);
      setWaitForSelector(node.data?.waitForSelector || false);
      setHumanClick(node.data?.humanClick || false);
      setTimeoutVal(node.data?.timeout || 0);
    }

    // Event Click specific variables (for safety)
    setClickX(node.data?.x || '');
    setClickY(node.data?.y || '');
    setFindBy(node.data?.findBy || 'xpath');
    setWaitSelectorTimeout(node.data?.waitSelectorTimeout || 5000);
    setMarkEl(node.data?.markEl || false);

    // Form value
    setGetFormValue(node.data?.getFormValue || false);
    setInputFormat(node.data?.inputFormat || "Text field");
    setValue(node.data?.value || "");
    setTypingDelay(node.data?.typingDelay || 0);
    setClearFormValue(node.data?.clearFormValue !== false);

    // Presskey
    setTargetElement(node.data?.targetElement || "");
    setLevel(node.data?.level || "Browser");
    setAction(node.data?.action || "Press a key");
    setKey(node.data?.key || "Enter");
    setPressTime(node.data?.pressTime || 0);

    // Close dropdowns
    setDropdownOpen(false);
    setSelectorTypeOpen(false);
    setClickTypeOpen(false);
    setLevelOpen(false);
    setActionOpen(false);
  }, [node]);

  const handleDescChange = (e) => {
    const val = e.target.value;
    setDescription(val);
    onUpdate(node.id, 'description', val);
  };

  const handleUrlChange = (e) => {
    const val = e.target.value;
    setUrl(val);
    onUpdate(node.id, 'url', val);
  };

  const handleDelayChange = (e) => {
    const val = parseInt(e.target.value, 10) || 0;
    setDelay(val);
    onUpdate(node.id, 'delay', val);
  };

  const handleOnErrorToggle = (e) => {
    const val = e.target.checked;
    setOnErrorEnabled(val);
    onUpdate(node.id, 'waitTabLoaded', val);
  };

  const selectWaitOption = (val) => {
    setWaitForNavigation(val);
    onUpdate(node.id, 'waitForNavigation', val);
    setDropdownOpen(false);
  };

  const navigationOptions = [
    { value: 'load', label: 'Load' },
    { value: 'domcontentloaded', label: 'DOMContentLoaded' },
    { value: 'networkidle0', label: 'Networkidle0' },
    { value: 'networkidle2', label: 'Networkidle2' },
  ];

  return (
    <div className={styles.propsPanel}>
      <div className={styles.propsPanelHeader}>
        <div className={styles.propsPanelTitle}>
          <span
            className={styles.propsPanelIcon}
            style={{ background: icon.bgColor }}
          >
            {icon.emoji}
          </span>
          <span>{label}</span>
        </div>
        <button className={styles.propsPanelClose} onClick={onClose}>✕</button>
      </div>

      <div className={styles.propsPanelBody}>
        {/* Description field */}
        <input
          type="text"
          className={styles.descriptionInput}
          placeholder="Description"
          value={description}
          onChange={handleDescChange}
        />

        {node.label === 'open-url' ? (
          <>
            {/* Open URL Input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Open url</label>
              <div className={styles.varInputWrapper}>
                <input
                  type="text"
                  placeholder="http://example.com/"
                  value={url}
                  onChange={handleUrlChange}
                />
                <button className={styles.varButton} title="Insert Variable">
                  {`{x}`}
                </button>
              </div>
            </div>

            {/* Wait for Navigation Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Wait for navigation</label>
              <div
                className={styles.customSelect}
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span>{waitForNavigation}</span>
                <span className={styles.chevron}>{dropdownOpen ? '▲' : '▼'}</span>
              </div>
              {dropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {navigationOptions.map(opt => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownOption} ${waitForNavigation === opt.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => selectWaitOption(opt.value)}
                    >
                      <span>
                        {opt.label}
                        <span className={styles.infoIcon}>ⓘ</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkboxes */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={newTab}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setNewTab(val);
                    onUpdate(node.id, 'newTab', val);
                  }}
                />
                <span>Open new tab</span>
              </label>
            </div>

            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={activeTab}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setActiveTab(val);
                    onUpdate(node.id, 'active', val);
                  }}
                />
                <span>Set as active tab</span>
              </label>
            </div>

            {/* Settings Section */}
            <h4 className={styles.sectionHeader}>Settings</h4>

            {/* Timeout */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (millisecond)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setTimeoutVal(val);
                  onUpdate(node.id, 'timeout', val);
                }}
              />
            </div>

            {/* Delay time */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <input
                type="number"
                value={delay}
                onChange={handleDelayChange}
              />
            </div>

            {/* On Error Toggle */}
            <div className={styles.propsField}>
              <label style={{ color: '#1a1a1a', fontWeight: 'bold' }}>On error</label>
              <div className={styles.toggleWrapper}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={onErrorEnabled}
                    onChange={handleOnErrorToggle}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Enable</span>
              </div>
            </div>
          </>
        ) : node.label === 'click-element' || node.label === 'click' || node.label === 'event-click' ? (
          <>
            {/* Selector Select Box */}
            <div className={styles.propsField}>
              <div className={styles.flexRow} style={{ gap: '0.4rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div
                    className={styles.customSelect}
                    onClick={() => setSelectorTypeOpen(!selectorTypeOpen)}
                  >
                    <span>{selectorType}</span>
                    <span className={styles.chevron}>{selectorTypeOpen ? '▲' : '▼'}</span>
                  </div>
                  {selectorTypeOpen && (
                    <div className={styles.dropdownOptions}>
                      {['XPath', 'CSS Selector'].map(opt => (
                        <div
                          key={opt}
                          className={`${styles.dropdownOption} ${selectorType === opt ? styles.dropdownOptionSelected : ''}`}
                          onClick={() => {
                            setSelectorType(opt);
                            if (node.label === 'event-click') {
                              onUpdate(node.id, 'findBy', opt === 'XPath' ? 'xpath' : 'cssSelector');
                            } else {
                              onUpdate(node.id, 'selectorType', opt);
                            }
                            setSelectorTypeOpen(false);
                          }}
                        >
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className={styles.iconButton} title="Select element on page">🎯</button>
                <button className={styles.iconButton} title="Verify element exists">✓</button>
              </div>
            </div>

            {/* Selector Path Input */}
            <div className={styles.propsField}>
              <div className={styles.varInputWrapper}>
                <input
                  type="text"
                  placeholder="//input[@name='search_query']"
                  value={selector}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelector(val);
                    onUpdate(node.id, 'selector', val);
                  }}
                />
                <button className={styles.varButton} title="Insert Variable">
                  {`{x}`}
                </button>
              </div>
            </div>

            {/* Click type */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <div
                className={styles.customSelect}
                onClick={() => setClickTypeOpen(!clickTypeOpen)}
              >
                <span>{clickType}</span>
                <span className={styles.chevron}>{clickTypeOpen ? '▲' : '▼'}</span>
              </div>
              {clickTypeOpen && (
                <div className={styles.dropdownOptions}>
                  {['Left click', 'Right click', 'Double click'].map(opt => (
                    <div
                      key={opt}
                      className={`${styles.dropdownOption} ${clickType === opt ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setClickType(opt);
                        if (node.label === 'event-click') {
                          let val = 'leftClick';
                          if (opt === 'Right click') val = 'rightClick';
                          if (opt === 'Double click') val = 'doubleClick';
                          onUpdate(node.id, 'selectOption', val);
                        } else {
                          onUpdate(node.id, 'clickType', opt);
                        }
                        setClickTypeOpen(false);
                      }}
                    >
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Selector options */}
            <div
              className={styles.collapsibleHeader}
              onClick={() => setSelectorOptionsCollapsed(!selectorOptionsCollapsed)}
            >
              <span className={styles.collapsibleChevron}>
                {selectorOptionsCollapsed ? '▶' : '▼'}
              </span>
              <span>Selector options</span>
            </div>
            {!selectorOptionsCollapsed && (
              <div className={styles.collapsibleContent}>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={multiple}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setMultiple(val);
                        onUpdate(node.id, 'multiple', val);
                      }}
                    />
                    <span>Multiple</span>
                  </label>
                </div>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={waitForSelector}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setWaitForSelector(val);
                        onUpdate(node.id, 'waitForSelector', val);
                      }}
                    />
                    <span>Wait for selector</span>
                  </label>
                </div>
              </div>
            )}

            {/* Human click */}
            <div className={styles.propsField}>
              <div className={styles.toggleWrapper}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={humanClick}
                    onChange={(e) => {
                      const val = e.target.checked;
                      setHumanClick(val);
                      onUpdate(node.id, 'humanClick', val);
                    }}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Human click</span>
              </div>
            </div>

            {/* Settings Section */}
            <h4 className={styles.sectionHeader}>Settings</h4>

            {/* Timeout */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (millisecond)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setTimeoutVal(val);
                  if (node.label === 'event-click') {
                    onUpdate(node.id, 'waitSelectorTimeout', val);
                  } else {
                    onUpdate(node.id, 'timeout', val);
                  }
                }}
              />
            </div>

            {/* Delay time */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <input
                type="number"
                value={delay}
                onChange={handleDelayChange}
              />
            </div>

            {/* On Error Toggle */}
            <div className={styles.propsField}>
              <label style={{ color: '#1a1a1a', fontWeight: 'bold' }}>On error</label>
              <div className={styles.toggleWrapper}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={onErrorEnabled}
                    onChange={handleOnErrorToggle}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Enable</span>
              </div>
            </div>
          </>
        ) : node.label === 'forms' || node.label === 'input-text' ? (
          <>
            {/* Selector Select Box */}
            <div className={styles.propsField}>
              <div className={styles.flexRow} style={{ gap: '0.4rem', alignItems: 'center' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <div
                    className={styles.customSelect}
                    onClick={() => setSelectorTypeOpen(!selectorTypeOpen)}
                  >
                    <span>{selectorType}</span>
                    <span className={styles.chevron}>{selectorTypeOpen ? '▲' : '▼'}</span>
                  </div>
                  {selectorTypeOpen && (
                    <div className={styles.dropdownOptions}>
                      {['XPath', 'CSS Selector'].map(opt => (
                        <div
                          key={opt}
                          className={`${styles.dropdownOption} ${selectorType === opt ? styles.dropdownOptionSelected : ''}`}
                          onClick={() => {
                            setSelectorType(opt);
                            onUpdate(node.id, 'selectorType', opt);
                            setSelectorTypeOpen(false);
                          }}
                        >
                          <span>{opt}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button className={styles.iconButton} title="Select element on page">🎯</button>
                <button className={styles.iconButton} title="Verify element exists">✓</button>
              </div>
            </div>

            {/* Selector Path Input */}
            <div className={styles.propsField}>
              <div className={styles.varInputWrapper}>
                <input
                  type="text"
                  placeholder="//input[@name='search_query']"
                  value={selector}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelector(val);
                    onUpdate(node.id, 'selector', val);
                  }}
                />
                <button className={styles.varButton} title="Insert Variable">
                  {`{x}`}
                </button>
              </div>
            </div>

            {/* Selector options */}
            <div
              className={styles.collapsibleHeader}
              onClick={() => setSelectorOptionsCollapsed(!selectorOptionsCollapsed)}
            >
              <span className={styles.collapsibleChevron}>
                {selectorOptionsCollapsed ? '▶' : '▼'}
              </span>
              <span>Selector options</span>
            </div>
            {!selectorOptionsCollapsed && (
              <div className={styles.collapsibleContent}>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={multiple}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setMultiple(val);
                        onUpdate(node.id, 'multiple', val);
                      }}
                    />
                    <span>Multiple</span>
                  </label>
                </div>
                <div className={styles.checkboxGroup}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={waitForSelector}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setWaitForSelector(val);
                        onUpdate(node.id, 'waitForSelector', val);
                      }}
                    />
                    <span>Wait for selector</span>
                  </label>
                </div>
              </div>
            )}

            {/* Get Form Value checkbox */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={getFormValue}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setGetFormValue(val);
                    onUpdate(node.id, 'getFormValue', val);
                  }}
                />
                <span>Get form value</span>
              </label>
            </div>

            {/* Input format dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <div
                className={styles.customSelect}
                onClick={() => setClickTypeOpen(!clickTypeOpen)}
              >
                <span>{inputFormat}</span>
                <span className={styles.chevron}>{clickTypeOpen ? '▲' : '▼'}</span>
              </div>
              {clickTypeOpen && (
                <div className={styles.dropdownOptions}>
                  {['Text field', 'Password', 'Textarea'].map(opt => (
                    <div
                      key={opt}
                      className={`${styles.dropdownOption} ${inputFormat === opt ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setInputFormat(opt);
                        onUpdate(node.id, 'inputFormat', opt);
                        setClickTypeOpen(false);
                      }}
                    >
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Value textarea input */}
            <div className={styles.propsField}>
              <div className={styles.varInputWrapper}>
                <textarea
                  className={styles.customTextarea}
                  placeholder="Value"
                  value={value}
                  onChange={(e) => {
                    const val = e.target.value;
                    setValue(val);
                    onUpdate(node.id, 'value', val);
                  }}
                  rows={2}
                />
                <button className={styles.varButton} style={{ alignSelf: 'stretch', height: 'auto' }} title="Insert Variable">
                  {`{x}`}
                </button>
              </div>
            </div>

            {/* Typing delay */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Typing delay (milliseconds)</label>
              <input
                type="number"
                value={typingDelay}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setTypingDelay(val);
                  onUpdate(node.id, 'typingDelay', val);
                }}
              />
            </div>

            {/* Clear form value */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={clearFormValue}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setClearFormValue(val);
                    onUpdate(node.id, 'clearFormValue', val);
                  }}
                />
                <span>Clear form value</span>
              </label>
            </div>

            {/* Settings Section */}
            <h4 className={styles.sectionHeader}>Settings</h4>

            {/* Timeout */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (millisecond)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setTimeoutVal(val);
                  onUpdate(node.id, 'timeout', val);
                }}
              />
            </div>

            {/* Delay time */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <input
                type="number"
                value={delay}
                onChange={handleDelayChange}
              />
            </div>

            {/* On Error Toggle */}
            <div className={styles.propsField}>
              <label style={{ color: '#1a1a1a', fontWeight: 'bold' }}>On error</label>
              <div className={styles.toggleWrapper}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={onErrorEnabled}
                    onChange={handleOnErrorToggle}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Enable</span>
              </div>
            </div>
          </>
        ) : node.label === 'press-key' || node.label === 'presskey' ? (
          <>
            {/* Target Select selector type */}
            <div className={styles.propsField}>
              <div style={{ position: 'relative' }}>
                <div
                  className={styles.customSelect}
                  onClick={() => setSelectorTypeOpen(!selectorTypeOpen)}
                >
                  <span>{selectorType}</span>
                  <span className={styles.chevron}>{selectorTypeOpen ? '▲' : '▼'}</span>
                </div>
                {selectorTypeOpen && (
                  <div className={styles.dropdownOptions}>
                    {['XPath', 'CSS Selector'].map(opt => (
                      <div
                        key={opt}
                        className={`${styles.dropdownOption} ${selectorType === opt ? styles.dropdownOptionSelected : ''}`}
                        onClick={() => {
                          setSelectorType(opt);
                          onUpdate(node.id, 'selectorType', opt);
                          setSelectorTypeOpen(false);
                        }}
                      >
                        <span>{opt}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Target Element path */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Target element (Optional)</label>
              <div className={styles.varInputWrapper}>
                <input
                  type="text"
                  placeholder="CSS Selector or XPath"
                  value={targetElement}
                  onChange={(e) => {
                    const val = e.target.value;
                    setTargetElement(val);
                    onUpdate(node.id, 'targetElement', val);
                  }}
                />
                <button className={styles.varButton} title="Insert Variable">
                  {`{x}`}
                </button>
              </div>
            </div>

            {/* Level */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Level</label>
              <div
                className={styles.customSelect}
                onClick={() => setLevelOpen(!levelOpen)}
              >
                <span>{level}</span>
                <span className={styles.chevron}>{levelOpen ? '▲' : '▼'}</span>
              </div>
              {levelOpen && (
                <div className={styles.dropdownOptions}>
                  {['Browser', 'System'].map(opt => (
                    <div
                      key={opt}
                      className={`${styles.dropdownOption} ${level === opt ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setLevel(opt);
                        onUpdate(node.id, 'level', opt);
                        setLevelOpen(false);
                      }}
                    >
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Action</label>
              <div
                className={styles.customSelect}
                onClick={() => setActionOpen(!actionOpen)}
              >
                <span>{action}</span>
                <span className={styles.chevron}>{actionOpen ? '▲' : '▼'}</span>
              </div>
              {actionOpen && (
                <div className={styles.dropdownOptions}>
                  {['Press a key', 'Press multiple keys'].map(opt => (
                    <div
                      key={opt}
                      className={`${styles.dropdownOption} ${action === opt ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setAction(opt);
                        onUpdate(node.id, 'action', opt);
                        setActionOpen(false);
                      }}
                    >
                      <span>{opt}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Key selector input tag */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Key</label>
              <div className={styles.flexRow} style={{ gap: '0.4rem', alignItems: 'center' }}>
                <div className={styles.tagInputWrapper}>
                  {key && (
                    <span className={styles.keyTag}>
                      {key} <button className={styles.tagClose} onClick={() => setKey('')}>✕</button>
                    </span>
                  )}
                  <input
                    type="text"
                    placeholder="Type a key..."
                    style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', fontSize: '0.85rem' }}
                    onKeyDown={(e) => {
                      e.preventDefault();
                      setKey(e.key);
                      onUpdate(node.id, 'key', e.key);
                    }}
                  />
                </div>
                <button className={styles.iconButton} title="Record Key Stroke">🎯</button>
              </div>
            </div>

            {/* Press time */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Press time (milliseconds)</label>
              <input
                type="number"
                value={pressTime}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setPressTime(val);
                  onUpdate(node.id, 'pressTime', val);
                }}
              />
            </div>

            {/* Settings Section */}
            <h4 className={styles.sectionHeader}>Settings</h4>

            {/* Timeout */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (millisecond)</label>
              <input
                type="number"
                value={timeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setTimeoutVal(val);
                  onUpdate(node.id, 'timeout', val);
                }}
              />
            </div>

            {/* Delay time */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <input
                type="number"
                value={delay}
                onChange={handleDelayChange}
              />
            </div>

            {/* On Error Toggle */}
            <div className={styles.propsField}>
              <label style={{ color: '#1a1a1a', fontWeight: 'bold' }}>On error</label>
              <div className={styles.toggleWrapper}>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={onErrorEnabled}
                    onChange={handleOnErrorToggle}
                  />
                  <span className={styles.slider}></span>
                </label>
                <span className={styles.toggleLabel}>Enable</span>
              </div>
            </div>
          </>
        ) : (
          /* Render simple editable fields for other block types */
          Object.entries(node.data || {}).map(([key, value]) => {
            if (['icon', 'disableBlock', 'observeElement', 'description'].includes(key)) return null;
            if (typeof value === 'object' && value !== null) return null;
            return (
              <div className={styles.propsField} key={key}>
                <label className={styles.propsFieldLabel}>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                <input
                  type={typeof value === 'number' ? 'number' : typeof value === 'boolean' ? 'checkbox' : 'text'}
                  defaultValue={String(value)}
                  onChange={(e) => onUpdate(node.id, key, e.target.value)}
                />
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

/* Main WorkflowPreview Component */
export default function WorkflowPreview({ data, height = 580 }) {
  const containerRef = useRef(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedNode, setSelectedNode] = useState(null);
  const [scale, setScale] = useState(1);
  const [workflowData, setWorkflowData] = useState(null);
  const [defaultView, setDefaultView] = useState({ x: 0, y: 0, scale: 1 });

  // Drag block state
  const [draggingNode, setDraggingNode] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Connect ports state
  const [connecting, setConnecting] = useState(null); // { sourceId, startX, startY, currentX, currentY }
  const [hoveredEdge, setHoveredEdge] = useState(null);

  useEffect(() => {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    setWorkflowData(parsed);

    const nodes = parsed?.drawflow?.nodes || [];
    if (nodes.length > 0) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(n => {
        minX = Math.min(minX, n.position.x);
        minY = Math.min(minY, n.position.y);
        maxX = Math.max(maxX, n.position.x + BLOCK_WIDTH);
        maxY = Math.max(maxY, n.position.y + BLOCK_HEIGHT);
      });

      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const containerW = 800;
      const containerH = (height || 420) - 44;
      const padding = 60;

      const fitScale = Math.min(
        (containerW - padding * 2) / contentW,
        (containerH - padding * 2) / contentH,
        1.2
      );
      const s = Math.max(0.5, Math.min(fitScale, 1.2));

      const centerX = (containerW - contentW * s) / 2 - minX * s;
      const centerY = (containerH - contentH * s) / 2 - minY * s;

      setPan({ x: centerX, y: centerY });
      setScale(s);
      setDefaultView({ x: centerX, y: centerY, scale: s });
    }
  }, [data, height]);

  useEffect(() => {
    if (workflowData) {
      const event = new CustomEvent('workflow-data-updated', { detail: workflowData });
      window.dispatchEvent(event);
    }
  }, [workflowData]);

  // Convert screen coords to SVG coords
  const screenToSvg = useCallback((clientX, clientY) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return {
      x: (clientX - rect.left - pan.x) / scale,
      y: (clientY - rect.top - pan.y) / scale,
    };
  }, [pan, scale]);

  // --- Panning ---
  const handleMouseDown = useCallback((e) => {
    if (e.target.closest(`.${styles.propsPanel}`)) return;
    if (draggingNode || connecting) return;
    setIsPanning(true);
    setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  }, [pan, draggingNode, connecting]);

  // --- Block dragging ---
  const handleBlockDragStart = useCallback((nodeId, e) => {
    const svgPos = screenToSvg(e.clientX, e.clientY);
    const node = workflowData?.drawflow?.nodes?.find(n => n.id === nodeId);
    if (!node) return;
    setDraggingNode(nodeId);
    setDragOffset({ x: svgPos.x - node.position.x, y: svgPos.y - node.position.y });
  }, [screenToSvg, workflowData]);

  // --- Port drag to connect ---
  const handlePortDragStart = useCallback((nodeId, portType, e) => {
    const node = workflowData?.drawflow?.nodes?.find(n => n.id === nodeId);
    if (!node) return;
    const isFallback = portType === 'fallback';
    const startX = node.position.x + BLOCK_WIDTH;
    const startY = node.position.y + (isFallback ? (BLOCK_HEIGHT - 14) : (BLOCK_HEIGHT / 2));
    const svgPos = screenToSvg(e.clientX, e.clientY);
    setConnecting({
      sourceId: nodeId,
      portType,
      startX,
      startY,
      currentX: svgPos.x,
      currentY: svgPos.y,
    });
  }, [workflowData, screenToSvg]);

  // --- Mouse move (pan, drag block, or draw connection) ---
  const handleMouseMove = useCallback((e) => {
    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      });
      return;
    }

    if (draggingNode) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      setWorkflowData(prev => {
        if (!prev) return prev;
        const newData = JSON.parse(JSON.stringify(prev));
        const node = newData.drawflow.nodes.find(n => n.id === draggingNode);
        if (node) {
          node.position.x = svgPos.x - dragOffset.x;
          node.position.y = svgPos.y - dragOffset.y;
        }
        return newData;
      });
      return;
    }

    if (connecting) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      setConnecting(prev => ({ ...prev, currentX: svgPos.x, currentY: svgPos.y }));
    }
  }, [isPanning, panStart, draggingNode, dragOffset, connecting, screenToSvg]);

  // --- Mouse up (finish pan, drag, or connection) ---
  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingNode) {
      setDraggingNode(null);
    }

    if (connecting) {
      // Check if mouse is over an input port
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const nodes = workflowData?.drawflow?.nodes || [];
      let targetNode = null;

      for (const node of nodes) {
        if (node.id === connecting.sourceId) continue;
        // Check if near input port (left side)
        const portX = node.position.x;
        const portY = node.position.y + BLOCK_HEIGHT / 2;
        const dist = Math.sqrt((svgPos.x - portX) ** 2 + (svgPos.y - portY) ** 2);
        if (dist < 25 / scale) {
          targetNode = node;
          break;
        }
      }

      if (targetNode) {
        // Create new edge
        setWorkflowData(prev => {
          if (!prev) return prev;
          const newData = JSON.parse(JSON.stringify(prev));
          const edgeId = `edge-${connecting.sourceId}-${targetNode.id}-${Date.now()}`;
          // Check if edge already exists
          const exists = newData.drawflow.edges.some(
            e => e.source === connecting.sourceId && e.target === targetNode.id && e.sourceHandle === `${connecting.sourceId}-${connecting.portType}-1`
          );
          if (!exists) {
            newData.drawflow.edges.push({
              id: edgeId,
              type: 'bezier',
              source: connecting.sourceId,
              target: targetNode.id,
              sourceHandle: `${connecting.sourceId}-${connecting.portType}-1`,
              targetHandle: `${targetNode.id}-input-1`,
              updatable: true,
              selectable: true,
              data: {},
              label: '',
              markerEnd: 'arrowclosed',
            });
          }
          return newData;
        });
      }

      setConnecting(null);
    }
  }, [isPanning, draggingNode, connecting, screenToSvg, workflowData, scale]);

  // --- Delete edge ---
  const handleDeleteEdge = useCallback((edgeId) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData.drawflow.edges = newData.drawflow.edges.filter(e => e.id !== edgeId);
      return newData;
    });
  }, []);

  // --- Delete node ---
  const handleDeleteNode = useCallback((nodeId) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      newData.drawflow.nodes = newData.drawflow.nodes.filter(n => n.id !== nodeId);
      newData.drawflow.edges = newData.drawflow.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );
      return newData;
    });
    setSelectedNode(prev => prev?.id === nodeId ? null : prev);
  }, []);

  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    setScale(s => Math.min(2, Math.max(0.3, s + delta)));
  }, []);

  const handleNodeClick = useCallback((node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  }, []);

  const handleFieldUpdate = useCallback((nodeId, key, value) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      const node = newData.drawflow.nodes.find(n => n.id === nodeId);
      if (node && node.data) {
        node.data[key] = value;
      }
      return newData;
    });
  }, []);

  const handleBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  if (!workflowData) return null;

  const nodes = workflowData.drawflow?.nodes || [];
  const edges = workflowData.drawflow?.edges || [];

  const edgeLines = edges.map(edge => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;
    const isFallback = edge.sourceHandle?.includes('fallback');
    return {
      id: edge.id,
      x1: sourceNode.position.x + BLOCK_WIDTH,
      y1: sourceNode.position.y + (isFallback ? (BLOCK_HEIGHT - 14) : (BLOCK_HEIGHT / 2)),
      x2: targetNode.position.x,
      y2: targetNode.position.y + BLOCK_HEIGHT / 2,
      isFallback,
    };
  }).filter(Boolean);

  // Find which node the connecting line is hovering over
  let connectingTarget = null;
  if (connecting) {
    for (const node of nodes) {
      if (node.id === connecting.sourceId) continue;
      const portX = node.position.x;
      const portY = node.position.y + BLOCK_HEIGHT / 2;
      const dist = Math.sqrt((connecting.currentX - portX) ** 2 + (connecting.currentY - portY) ** 2);
      if (dist < 25 / scale) {
        connectingTarget = node.id;
        break;
      }
    }
  }

  return (
    <div className={styles.workflowContainer} style={{ height }}>
      <div className={styles.workflowToolbar}>
        <span className={styles.workflowTitle}>🔧 Workflow Preview</span>
        <div className={styles.workflowHints}>
          <span>Drag blocks to move</span>
          <span>•</span>
          <span>Drag output port ○ to connect</span>
          <span>•</span>
          <span>Click edge to delete</span>
        </div>
        <div className={styles.workflowControls}>
          <button onClick={() => setScale(s => Math.min(2, s + 0.1))} title="Zoom In">＋</button>
          <span className={styles.zoomLabel}>{Math.round(scale * 100)}%</span>
          <button onClick={() => setScale(s => Math.max(0.3, s - 0.1))} title="Zoom Out">－</button>
          <button onClick={() => { setScale(defaultView.scale); setPan({ x: defaultView.x, y: defaultView.y }); }} title="Reset View">⟲</button>
          <button
            onClick={() => {
              const blob = new Blob([JSON.stringify(workflowData)], { type: 'application/octet-stream' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `Start.covertia`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            className={styles.toolbarExportBtn}
            title="Export .covertia"
          >
            Export
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={styles.workflowCanvas}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleBackgroundClick}
        style={{ cursor: draggingNode ? 'grabbing' : connecting ? 'crosshair' : isPanning ? 'grabbing' : 'grab' }}
      >
        <svg width="100%" height="100%" className={styles.workflowSvg}>
          <defs>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"
              patternTransform={`translate(${pan.x % 20}, ${pan.y % 20})`}>
              <circle cx="10" cy="10" r="1" fill="rgba(0,0,0,0.08)" />
            </pattern>
          </defs>

          <rect width="100%" height="100%" fill="url(#grid)" />

          <g transform={`translate(${pan.x}, ${pan.y}) scale(${scale})`}>
            {/* Connection lines */}
            {edgeLines.map(edge => (
              <ConnectionLine
                key={edge.id}
                {...edge}
                onDelete={handleDeleteEdge}
                isHovered={hoveredEdge === edge.id}
                onMouseEnter={() => setHoveredEdge(edge.id)}
                onMouseLeave={() => setHoveredEdge(null)}
              />
            ))}

            {/* Live connecting line */}
            {connecting && (
              <g>
                <path
                  d={(() => {
                    const dx = Math.abs(connecting.currentX - connecting.startX) * 0.5;
                    return `M ${connecting.startX} ${connecting.startY} C ${connecting.startX + dx} ${connecting.startY}, ${connecting.currentX - dx} ${connecting.currentY}, ${connecting.currentX} ${connecting.currentY}`;
                  })()}
                  fill="none"
                  stroke={connecting.portType === 'fallback' ? '#f85149' : '#58a6ff'}
                  strokeWidth={2}
                  strokeDasharray="6 4"
                />
                <circle cx={connecting.currentX} cy={connecting.currentY} r={4} fill={connecting.portType === 'fallback' ? '#f85149' : '#58a6ff'} />
              </g>
            )}

            {/* Block nodes */}
            {nodes.map(node => (
              <BlockNode
                key={node.id}
                node={node}
                isSelected={selectedNode?.id === node.id}
                onClick={handleNodeClick}
                onDragStart={handleBlockDragStart}
                onPortDragStart={handlePortDragStart}
                connectingTarget={connectingTarget}
                scale={scale}
                onDeleteNode={handleDeleteNode}
              />
            ))}
          </g>
        </svg>
      </div>

      <PropertiesPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdate={handleFieldUpdate}
      />
    </div>
  );
}
