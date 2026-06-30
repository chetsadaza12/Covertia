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
  'riTimerLine': { emoji: '⏱', color: '#ffffff', bgColor: '#10b981' },
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
  'delay': 'Delay',
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
          cx={BLOCK_WIDTH} cy={hasFallback ? 17 : BLOCK_HEIGHT / 2}
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
            cx={BLOCK_WIDTH} cy={43}
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

function ParametersModal({ isOpen, onClose, parameters = [], onUpdate }) {
  const [selectedParamId, setSelectedParamId] = useState(parameters[0]?.id || null);
  const [optionsExpanded, setOptionsExpanded] = useState(true);

  // Sync selectedParamId if it becomes invalid
  useEffect(() => {
    if (parameters.length > 0 && (!selectedParamId || !parameters.some(p => p.id === selectedParamId))) {
      setSelectedParamId(parameters[0].id);
    }
  }, [parameters, selectedParamId]);

  if (!isOpen) return null;

  const handleAddParam = (type) => {
    const id = `${type}_param_${Date.now().toString().slice(-4)}`;
    let newParam = {
      id,
      placeholder: type === 'string' ? 'Enter text' : type === 'filepath' ? 'C:/cookies/account1.json' : '',
      data: { required: false },
      defaultValue: type === 'checkbox' ? false : '',
      name: `${type}_param_${parameters.length + 1}`,
      type,
      description: '',
      label: type.charAt(0).toUpperCase() + type.slice(1)
    };

    if (type === 'divider') {
      newParam.name = '';
      newParam.label = '';
      newParam.data = { label: 'Divider', thickness: 1, marginBottom: 8, marginTop: 8 };
    } else if (type === 'inline') {
      newParam.name = '';
      newParam.label = '';
      newParam.type = 'inline';
      newParam.data = { height: 16 };
    } else if (type === 'label') {
      newParam.name = '';
      newParam.label = 'Label';
      newParam.data = { text: 'Label text', variant: 'default' };
    } else if (type === 'filepath') {
      newParam.type = 'filepath';
      newParam.data = { required: false, useMask: false };
    }

    const updated = [...parameters, newParam];
    onUpdate(updated);
    setSelectedParamId(id);
  };

  const handleDuplicate = (param, index) => {
    const newId = `${param.type}_param_${Date.now().toString().slice(-4)}`;
    const clone = JSON.parse(JSON.stringify(param));
    clone.id = newId;
    clone.name = param.name ? `${param.name}_copy` : '';
    const updated = [...parameters];
    updated.splice(index + 1, 0, clone);
    onUpdate(updated);
    setSelectedParamId(newId);
  };

  const handleDelete = (id) => {
    const updated = parameters.filter(p => p.id !== id);
    onUpdate(updated);
    if (selectedParamId === id) {
      setSelectedParamId(updated[0]?.id || null);
    }
  };

  const handleMove = (index, direction) => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === parameters.length - 1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const updated = [...parameters];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    onUpdate(updated);
  };

  const selectedParam = parameters.find(p => p.id === selectedParamId);

  const handleParamFieldChange = (field, value) => {
    if (!selectedParam) return;
    const updated = parameters.map(p => {
      if (p.id === selectedParamId) {
        return { ...p, [field]: value };
      }
      return p;
    });
    onUpdate(updated);
  };

  const handleParamDataChange = (field, value) => {
    if (!selectedParam) return;
    const updated = parameters.map(p => {
      if (p.id === selectedParamId) {
        const newData = { ...p.data, [field]: value };
        return { ...p, data: newData };
      }
      return p;
    });
    onUpdate(updated);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>Parameters</h2>
          <button className={styles.modalCloseBtn} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          {/* Left Column - Add Options */}
          <div className={styles.modalLeftCol}>
            <div className={styles.sidebarSection}>
              <h4 className={styles.sidebarSectionHeader}>PARAMETER</h4>
              <div className={styles.addButtonList}>
                <button onClick={() => handleAddParam('checkbox')}>Checkbox <span>+</span></button>
                <button onClick={() => handleAddParam('filepath')}>File Path <span>+</span></button>
                <button onClick={() => handleAddParam('json')}>Input (JSON) <span>+</span></button>
                <button onClick={() => handleAddParam('number')}>Input (number) <span>+</span></button>
                <button onClick={() => handleAddParam('string')}>Input (string) <span>+</span></button>
              </div>
            </div>
            <div className={styles.sidebarSection}>
              <h4 className={styles.sidebarSectionHeader}>LAYOUT</h4>
              <div className={styles.addButtonList}>
                <button onClick={() => handleAddParam('divider')}>Divider <span>+</span></button>
                <button onClick={() => handleAddParam('inline')}>Spacer <span>+</span></button>
                <button onClick={() => handleAddParam('label')}>Label <span>+</span></button>
              </div>
            </div>
          </div>

          {/* Middle Column - Current Parameters List */}
          <div className={styles.modalMidCol}>
            <div className={styles.midColHeader}>
              <span>CURRENT PARAMETERS</span>
              <span title="View mode" style={{ cursor: 'pointer', width: 10, height: 10, borderRadius: '50%', background: '#8b5cf6', display: 'inline-block' }}></span>
            </div>
            <div className={styles.paramListContainer}>
              {parameters.map((param, index) => {
                const isSel = param.id === selectedParamId;
                const isDiv = param.type === 'divider';
                const isSpc = param.type === 'inline';
                const isLbl = param.type === 'label';
                
                let displayName = param.label || param.type;
                if (isDiv) displayName = param.data?.label || 'Divider';
                if (isSpc) displayName = 'Inline Spacer';
                if (isLbl) displayName = param.label || 'Label';

                let typeLabel = param.type;
                if (isDiv) typeLabel = 'Divider';
                if (isSpc) typeLabel = 'Spacer';
                if (isLbl) typeLabel = 'Label';
                if (param.type === 'filepath') typeLabel = 'File Path';
                if (param.type === 'json') typeLabel = 'Input (JSON)';
                if (param.type === 'number') typeLabel = 'Input (number)';
                if (param.type === 'string') typeLabel = 'Input (string)';

                return (
                  <div
                    key={param.id}
                    className={`${styles.paramItemCard} ${isSel ? styles.paramItemCardSelected : ''}`}
                    onClick={() => setSelectedParamId(param.id)}
                  >
                    <div className={styles.paramCardLeft}>
                      <span className={styles.dragHandleIcon}>:::</span>
                      <div className={styles.paramCardInfo}>
                        <div className={styles.paramCardTitle}>{displayName}</div>
                        <div className={styles.paramCardType}>{typeLabel}</div>
                      </div>
                    </div>
                    <div className={styles.paramCardActions}>
                      <button onClick={(e) => { e.stopPropagation(); handleMove(index, 'up'); }} disabled={index === 0} title="Move Up">▲</button>
                      <button onClick={(e) => { e.stopPropagation(); handleMove(index, 'down'); }} disabled={index === parameters.length - 1} title="Move Down">▼</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDuplicate(param, index); }} title="Duplicate">📑</button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(param.id); }} title="Delete">🗑</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column - Selected Parameter Details */}
          <div className={styles.modalRightCol}>
            {selectedParam ? (
              <div className={styles.detailsContainer}>
                <h4 className={styles.detailsHeader}>PARAMETER DETAILS</h4>

                {/* Name field (only for inputs) */}
                {selectedParam.type !== 'divider' && selectedParam.type !== 'inline' && selectedParam.type !== 'label' && (
                  <div className={styles.detailsField}>
                    <label>Name</label>
                    <input
                      type="text"
                      value={selectedParam.name || ''}
                      onChange={(e) => handleParamFieldChange('name', e.target.value)}
                    />
                  </div>
                )}

                {/* Label field */}
                {selectedParam.type !== 'divider' && selectedParam.type !== 'inline' && (
                  <div className={styles.detailsField}>
                    <label>Label</label>
                    <input
                      type="text"
                      value={selectedParam.label || ''}
                      onChange={(e) => handleParamFieldChange('label', e.target.value)}
                    />
                  </div>
                )}

                {/* Placeholder field */}
                {selectedParam.type !== 'checkbox' && selectedParam.type !== 'divider' && selectedParam.type !== 'inline' && selectedParam.type !== 'label' && (
                  <div className={styles.detailsField}>
                    <label>Placeholder</label>
                    <input
                      type="text"
                      value={selectedParam.placeholder || ''}
                      onChange={(e) => handleParamFieldChange('placeholder', e.target.value)}
                    />
                  </div>
                )}

                {/* Default value field */}
                <div className={styles.detailsField}>
                  <label>Default value</label>
                  {selectedParam.type === 'checkbox' ? (
                    <label className={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={!!selectedParam.defaultValue}
                        onChange={(e) => handleParamFieldChange('defaultValue', e.target.checked)}
                      />
                      <span>Text</span>
                    </label>
                  ) : selectedParam.type === 'filepath' ? (
                    <div className={styles.varInputWrapper} style={{ display: 'flex', alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="Text"
                        value={selectedParam.defaultValue || ''}
                        onChange={(e) => handleParamFieldChange('defaultValue', e.target.value)}
                        style={{ flex: 1 }}
                      />
                      <button className={styles.varButton} title="Browse File" style={{ borderLeft: '1px solid rgba(0,0,0,0.1)' }}>📁</button>
                    </div>
                  ) : selectedParam.type === 'divider' ? (
                    <input
                      type="text"
                      value={selectedParam.data?.label || ''}
                      placeholder="Divider label text"
                      onChange={(e) => handleParamDataChange('label', e.target.value)}
                    />
                  ) : selectedParam.type === 'label' ? (
                    <textarea
                      value={selectedParam.data?.text || ''}
                      placeholder="Label content text"
                      onChange={(e) => handleParamDataChange('text', e.target.value)}
                      rows={3}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  ) : selectedParam.type === 'inline' ? (
                    <input
                      type="number"
                      value={selectedParam.data?.height || 16}
                      onChange={(e) => handleParamDataChange('height', parseInt(e.target.value, 10) || 16)}
                    />
                  ) : (
                    <input
                      type="text"
                      placeholder={selectedParam.type === 'number' ? 'NULL' : 'Text'}
                      value={selectedParam.defaultValue || ''}
                      onChange={(e) => handleParamFieldChange('defaultValue', e.target.value)}
                    />
                  )}
                </div>

                {/* Collapsible Options Section */}
                <div className={styles.detailsOptionsBlock}>
                  <div
                    className={styles.collapsibleHeader}
                    onClick={() => setOptionsExpanded(!optionsExpanded)}
                    style={{ borderTop: '1px solid rgba(0,0,0,0.06)', paddingTop: '0.8rem', marginTop: '0.8rem' }}
                  >
                    <span className={styles.collapsibleChevron}>{optionsExpanded ? '▼' : '▶'}</span>
                    <span>Options</span>
                  </div>

                  {optionsExpanded && (
                    <div className={styles.collapsibleContent} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      {/* Parameter required checkbox (for number/string/json/filepath/checkbox) */}
                      {['number', 'string', 'json', 'filepath', 'checkbox'].includes(selectedParam.type) && (
                        <label className={styles.checkboxLabel}>
                          <input
                            type="checkbox"
                            checked={!!selectedParam.data?.required}
                            onChange={(e) => handleParamDataChange('required', e.target.checked)}
                          />
                          <span>Parameter required</span>
                        </label>
                      )}

                      {/* Description textarea */}
                      <div className={styles.detailsField} style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: '#57606a', marginBottom: '0.25rem' }}>Description</label>
                        <textarea
                          value={selectedParam.description || ''}
                          onChange={(e) => handleParamFieldChange('description', e.target.value)}
                          rows={2}
                          placeholder="Parameter description..."
                          style={{ width: '100%', resize: 'none' }}
                        />
                      </div>

                      {/* Divided checkbox & label */}
                      <label className={styles.checkboxLabel}>
                        <input
                          type="checkbox"
                          checked={!!selectedParam.data?.divided}
                          onChange={(e) => handleParamDataChange('divided', e.target.checked)}
                        />
                        <span>Divided</span>
                      </label>

                      <div className={styles.detailsField} style={{ margin: 0 }}>
                        <label style={{ fontSize: '0.75rem', color: '#57606a', marginBottom: '0.25rem' }}>Divided label</label>
                        <input
                          type="text"
                          value={selectedParam.data?.dividedLabel || ''}
                          onChange={(e) => handleParamDataChange('dividedLabel', e.target.value)}
                          disabled={!selectedParam.data?.divided}
                          placeholder="Section header text"
                        />
                      </div>

                      {/* Use input masking (filepath/string specific) */}
                      {['filepath', 'string'].includes(selectedParam.type) && (
                        <div className={styles.propsField} style={{ margin: 0 }}>
                          <div className={styles.toggleWrapper} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <label className={styles.switch}>
                              <input
                                type="checkbox"
                                checked={!!selectedParam.data?.useMask}
                                onChange={(e) => handleParamDataChange('useMask', e.target.checked)}
                              />
                              <span className={styles.slider}></span>
                            </label>
                            <span className={styles.toggleLabel} style={{ fontSize: '0.78rem' }}>
                              Use input masking <span title="Input mask details" style={{ cursor: 'pointer', color: 'rgba(0,0,0,0.35)' }}>ⓘ</span>
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className={styles.detailsPlaceholder}>
                <span>Select a parameter to view and configure details.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function VariableInput({ value, onChange, placeholder, isTextarea = false, parameters = [] }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (varName) => {
    let bracketSyntax = `{{variables.${varName}}}`;
    if (varName === 'variables' || varName === 'globalData' || varName === 'googleSheets') {
      bracketSyntax = `{{${varName}}}`;
    }
    onChange(value + bracketSyntax);
    setDropdownOpen(false);
  };

  const defaultOptions = ['variables', 'globalData', 'googleSheets'];
  const allOptions = [...defaultOptions, ...parameters.map(p => p.name).filter(Boolean)];

  return (
    <div className={styles.varInputWrapper} ref={ref} style={{ position: 'relative', width: '100%', display: 'flex' }}>
      {isTextarea ? (
        <textarea
          className={styles.customTextarea}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          style={{ flex: 1, paddingRight: '40px' }}
        />
      ) : (
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ flex: 1, paddingRight: '40px' }}
        />
      )}
      <button
        type="button"
        className={styles.varButton}
        title="Insert Variable"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        style={{
          position: 'absolute',
          right: '1px',
          top: '1px',
          bottom: '1px',
          height: 'calc(100% - 2px)',
          borderLeft: '1px solid rgba(0,0,0,0.1)',
          background: '#f6f8fa',
          color: '#24292f',
          padding: '0 10px',
          fontSize: '0.85rem',
          cursor: 'pointer',
          borderTopRightRadius: '6px',
          borderBottomRightRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2
        }}
      >
        {`{x}`}
      </button>
      {dropdownOpen && (
        <div className={styles.varDropdownMenu}>
          {allOptions.map((opt, idx) => {
            const isHeader = idx < 3;
            return (
              <div
                key={opt}
                className={styles.varDropdownItem}
                style={{
                  color: isHeader ? '#57606a' : '#24292f',
                  fontWeight: isHeader ? 'normal' : '500',
                  borderBottom: idx === 2 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                  padding: '6px 12px',
                  cursor: 'pointer',
                  fontSize: '0.82rem',
                  textAlign: 'left'
                }}
                onClick={() => handleSelect(opt)}
              >
                {opt}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PropertiesPanel({ node, onClose, onUpdate, onOpenParameters, parameters = [] }) {
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
  const [time, setTime] = useState(node.data?.time || '5000');

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

    // Delay
    setTime(node.data?.time || '5000');

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

        {node.label === 'trigger' && (
          <>
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '0.75rem 0' }} />
            <button
              onClick={() => onOpenParameters && onOpenParameters()}
              className={styles.parametersBtn}
            >
              <span style={{ fontSize: '1.1rem', marginRight: '0.35rem' }}>⌘</span>
              <span>Parameters</span>
            </button>
          </>
        )}

        {node.label === 'open-url' ? (
          <>
            {/* Open URL Input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Open url</label>
              <VariableInput
                placeholder="http://example.com/"
                value={url}
                onChange={(val) => {
                  setUrl(val);
                  onUpdate(node.id, 'url', val);
                }}
                parameters={parameters}
              />
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
              <VariableInput
                placeholder="//input[@name='search_query']"
                value={selector}
                onChange={(val) => {
                  setSelector(val);
                  onUpdate(node.id, 'selector', val);
                }}
                parameters={parameters}
              />
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
              <VariableInput
                placeholder="//input[@name='search_query']"
                value={selector}
                onChange={(val) => {
                  setSelector(val);
                  onUpdate(node.id, 'selector', val);
                }}
                parameters={parameters}
              />
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
              <VariableInput
                placeholder="Value"
                value={value}
                onChange={(val) => {
                  setValue(val);
                  onUpdate(node.id, 'value', val);
                }}
                isTextarea={true}
                parameters={parameters}
              />
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
              <VariableInput
                placeholder="CSS Selector or XPath"
                value={targetElement}
                onChange={(val) => {
                  setTargetElement(val);
                  onUpdate(node.id, 'targetElement', val);
                }}
                parameters={parameters}
              />
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
        ) : node.label === 'delay' ? (
          <>
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <VariableInput
                placeholder="5000"
                value={time}
                onChange={(val) => {
                  setTime(val);
                  onUpdate(node.id, 'time', val);
                }}
                parameters={parameters}
              />
              <div style={{ fontSize: '0.75rem', color: '#57606a', marginTop: '0.4rem', lineHeight: '1.4' }}>
                Can be a number, or x, y. Example: 2, 5 random n range 2 → 5 for each run. x, y is integer or float
              </div>
            </div>
          </>
        ) : (
          /* Render simple editable fields for other block types */
          Object.entries(node.data || {}).map(([key, value]) => {
            if (node.label === 'trigger') return null;
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
  const [showParametersModal, setShowParametersModal] = useState(false);

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
    const hasFallback = node.type === 'BlockBasicWithFallback';
    const startX = node.position.x + BLOCK_WIDTH;
    const startY = node.position.y + (isFallback ? 43 : (hasFallback ? 17 : BLOCK_HEIGHT / 2));
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

  // --- Update parameters for trigger/Start node ---
  const handleUpdateParameters = useCallback((nodeId, newParams) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      const node = newData.drawflow.nodes.find(n => n.id === nodeId);
      if (node && node.data) {
        node.data.parameters = newParams;
      }
      return newData;
    });
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
    const sourceHasFallback = sourceNode.type === 'BlockBasicWithFallback';
    return {
      id: edge.id,
      x1: sourceNode.position.x + BLOCK_WIDTH,
      y1: sourceNode.position.y + (isFallback ? 43 : (sourceHasFallback ? 17 : BLOCK_HEIGHT / 2)),
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
        <span className={styles.workflowTitle}>Workflow Preview</span>
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
        onOpenParameters={() => setShowParametersModal(true)}
        parameters={workflowData?.drawflow?.nodes?.find(n => n.label === 'trigger')?.data?.parameters || []}
      />

      <ParametersModal
        isOpen={showParametersModal}
        onClose={() => setShowParametersModal(false)}
        parameters={workflowData.drawflow.nodes.find(n => n.id === selectedNode?.id)?.data?.parameters || []}
        onUpdate={(newParams) => handleUpdateParameters(selectedNode.id, newParams)}
      />
    </div>
  );
}
