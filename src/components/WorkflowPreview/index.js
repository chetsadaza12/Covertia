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
  'riClipboardLine': { emoji: '📋', color: '#ffffff', bgColor: '#2ea043' },
  'riTerminalBoxLine': { emoji: '💻', color: '#ffffff', bgColor: '#2ea043' },
  'riCodeLine': { emoji: '</>', color: '#ffffff', bgColor: '#2ea043' },
  'riSearch2Line': { emoji: '🔍', color: '#ffffff', bgColor: '#2ea043' },
  'riDatabaseFill': { emoji: '🗄', color: '#ffffff', bgColor: '#2ea043' },
  'riEarthLine': { emoji: '🌐', color: '#ffffff', bgColor: '#2ea043' },
  'riFolderZipLine': { emoji: '📁', color: '#ffffff', bgColor: '#2ea043' },
  'riSignalWifiLine': { emoji: '⏳', color: '#ffffff', bgColor: '#10b981' },
  'riTimerFlashLine': { emoji: '⏳', color: '#ffffff', bgColor: '#10b981' },
  'riSettings3Line': { emoji: '⚙️', color: '#ffffff', bgColor: '#2ea043' },
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
  'clipboard': 'Clipboard',
  'command': 'Cmd',
  'commandPro': 'Command',
  'generate-2fa': 'Generate 2FA',
  'image-search': 'Image Search',
  'resource-status': 'Resource Status',
  'browser-request': 'Browser Request',
  'blocks-group': 'Blocks Group',
  'wait-connections': 'Wait Connections',
  'workflow-state': 'Workflow State',
  'power-shell': 'PowerShell',
  'loop': 'Loop',
  'conditions': 'Conditions',
  'javascript-code': 'JavaScript',
  'take-screenshot': 'Screenshot',
};

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 60;
const PORT_RADIUS = 8;

function getIcon(iconKey, label) {
  if (label === 'generate-2fa') {
    return { emoji: '🔒', color: '#ffffff', bgColor: '#2ea043' };
  }
  return BLOCK_ICONS[iconKey] || BLOCK_ICONS['default'];
}

function getLabel(label) {
  if (!label) return '';
  return LABEL_MAP[label] || String(label).replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
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
  connectingTarget, scale, onDeleteNode, onMoveToGroup, onMoveFromGroup, onNestedDragStart, onUpdate
}) {
  const icon = getIcon(node.data?.icon, node.label);
  const label = getLabel(node.label);
  const isEnd = node.label === 'end';
  const isTrigger = node.label === 'trigger';
  const hasFallback = node.type === 'BlockBasicWithFallback';
  const isGroup = node.type === 'BlockGroup' || node.label === 'blocks-group';
  const groupBlocks = node.data?.blocks || [];
  const currentHeight = isGroup ? (90 + groupBlocks.length * 30 + 42) : BLOCK_HEIGHT;

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
        <g>
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

          {/* Move to Group button - show for basic nodes on hover */}
          {!isGroup && !isEnd && (
            <g
              onClick={(e) => {
                e.stopPropagation();
                onMoveToGroup(node.id);
              }}
              style={{ cursor: 'pointer' }}
              title="Move to Group"
            >
              <rect
                x={42}
                y={-32}
                width={28}
                height={28}
                rx={6}
                ry={6}
                fill="#ffffff"
                stroke="rgba(0,0,0,0.12)"
                strokeWidth={1}
              />
              <g transform="translate(48, -26)">
                <rect x="1" y="1" width="14" height="14" rx="2" fill="none" stroke="#24292f" strokeWidth="1.2" strokeDasharray="2 2" />
                <polygon points="10,10 13,12 11,14" fill="#24292f" />
                <line x1="7" y1="7" x2="11" y2="11" stroke="#24292f" strokeWidth="1.2" strokeLinecap="round" />
              </g>
            </g>
          )}
        </g>
      )}
      {/* Shadow */}
      <rect
        x={2} y={3}
        width={BLOCK_WIDTH} height={currentHeight}
        rx={12} ry={12}
        fill="rgba(0,0,0,0.08)"
      />
      {/* Block body */}
      <rect
        x={0} y={0}
        width={BLOCK_WIDTH} height={currentHeight}
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
          cx={0} cy={isGroup ? 30 : currentHeight / 2}
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
          cx={BLOCK_WIDTH} cy={isGroup ? 30 : (hasFallback ? 17 : currentHeight / 2)}
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
      {isGroup && (
        <foreignObject x={14} y={54} width={BLOCK_WIDTH - 28} height={26}>
          <input
            type="text"
            placeholder="Group name"
            value={node.data?.name || ''}
            onChange={(e) => onUpdate(node.id, 'name', e.target.value)}
            style={{
              width: '100%',
              height: '100%',
              padding: '0 8px',
              border: '1px solid rgba(0,0,0,0.12)',
              borderRadius: '4px',
              fontSize: '0.78rem',
              boxSizing: 'border-box',
              outline: 'none',
              background: '#ffffff',
              color: '#24292f'
            }}
          />
        </foreignObject>
      )}

      {isGroup && groupBlocks.map((b, idx) => {
        const y = 86 + idx * 30;
        const bIcon = getIcon(b.data?.icon, b.label);
        const bLabel = getLabel(b.label);
        const dispLabel = bLabel.length > 16 ? bLabel.slice(0, 14) + '...' : bLabel;
        return (
          <g key={b.id}>
            <rect
              x={14}
              y={y}
              width={BLOCK_WIDTH - 28}
              height={24}
              rx={6}
              ry={6}
              fill="#f6f8fa"
              stroke="rgba(0,0,0,0.06)"
              strokeWidth={1}
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => onNestedDragStart && onNestedDragStart(node.id, b.id, e)}
            />
            <text x={24} y={y + 16} fontSize={11} style={{ pointerEvents: 'none' }}>
              {bIcon.emoji}
            </text>
            <text x={42} y={y + 16} fontSize={11} fontWeight={500} fill="#24292f" style={{ pointerEvents: 'none' }}>
              {dispLabel}
            </text>
            {/* Remove from group × button */}
            <g
              onClick={(e) => {
                e.stopPropagation();
                onMoveFromGroup(node.id, b.id);
              }}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={BLOCK_WIDTH - 24} cy={y + 12} r={7} fill="rgba(0,0,0,0.06)" />
              <text x={BLOCK_WIDTH - 24} y={y + 15} textAnchor="middle" fontSize={9} fill="#57606a" fontWeight="bold">×</text>
            </g>
          </g>
        );
      })}

      {isGroup && (
        <g>
          <rect
            x={14}
            y={86 + groupBlocks.length * 30}
            width={BLOCK_WIDTH - 28}
            height={32}
            rx={6}
            ry={6}
            fill="none"
            stroke="rgba(0,0,0,0.15)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />
          <text
            x={BLOCK_WIDTH / 2}
            y={86 + groupBlocks.length * 30 + 20}
            textAnchor="middle"
            fontSize={11}
            fill="#57606a"
            fontWeight="500"
            style={{ pointerEvents: 'none' }}
          >
            Drag & drop a block here
          </text>
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

function VariableInput({ value, onChange, placeholder, isTextarea = false, parameters = [], showImageButton = false }) {
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

  const handleFileChange = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // If file.path is available (e.g. in Electron/webview environment), use it directly.
        // Otherwise, fall back to the simulated desktop path.
        const path = file.path || ("C:\\Users\\Jed\\Desktop\\" + file.name);
        onChange(path);
      }
    };
    fileInput.click();
  };

  const defaultOptions = ['variables', 'globalData', 'googleSheets'];
  const allOptions = [...defaultOptions, ...parameters.map(p => p.name).filter(Boolean)];

  return (
    <div className={styles.varInputWrapper} ref={ref} style={{ position: 'relative', width: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', position: 'relative', width: '100%' }}>
        {isTextarea ? (
          <textarea
            className={styles.customTextarea}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={2}
            style={{ flex: 1, paddingRight: showImageButton ? '82px' : '40px' }}
          />
        ) : (
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{ flex: 1, paddingRight: showImageButton ? '82px' : '40px' }}
          />
        )}
        {showImageButton && (
          <button
            type="button"
            title="Select Image"
            onClick={handleFileChange}
            style={{
              position: 'absolute',
              right: '43px',
              top: '3px',
              bottom: '3px',
              width: '28px',
              border: '1px solid rgba(0, 0, 0, 0.12)',
              borderRadius: '4px',
              background: '#f6f8fa',
              color: '#57606a',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
              padding: 0
            }}
          >
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
          </button>
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

    </div>
  );
}

function PropertiesPanel({ node, onClose, onUpdate, onOpenParameters, parameters: originalParameters = [], workflowData }) {
  if (!node) return null;
  const icon = getIcon(node.data?.icon, node.label);
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

  // Collect variables assigned dynamically by workflow blocks (e.g. Clipboard's variableName)
  const nodeVariables = [];
  if (workflowData?.drawflow?.nodes) {
    workflowData.drawflow.nodes.forEach(n => {
      if (n.data) {
        if (n.data.variableName && n.data.variableName.trim() !== '') {
          nodeVariables.push(n.data.variableName.trim());
        }
        if (n.data.assignToVariable && n.data.assignToVariable.trim() !== '') {
          nodeVariables.push(n.data.assignToVariable.trim());
        }
      }
    });
  }
  const parameters = [
    ...originalParameters,
    ...Array.from(new Set(nodeVariables)).map(v => ({ name: v, label: v }))
  ];

  const [clipboardType, setClipboardType] = useState(node.data?.type || 'get');
  const [assignVariable, setAssignVariable] = useState(node.data?.assignVariable !== false);
  const [variableName, setVariableName] = useState(node.data?.variableName || '');
  const [saveData, setSaveData] = useState(node.data?.saveData || false);
  const [dataColumn, setDataColumn] = useState(node.data?.dataColumn || '');
  const [dataToCopy, setDataToCopy] = useState(node.data?.dataToCopy || '');
  const [copySelectedText, setCopySelectedText] = useState(node.data?.copySelectedText || false);
  const [clipboardTypeDropdownOpen, setClipboardTypeDropdownOpen] = useState(false);
  const [dataColumnDropdownOpen, setDataColumnDropdownOpen] = useState(false);

  const [commandVal, setCommandVal] = useState(node.data?.command || '');
  const [regexVal, setRegexVal] = useState(node.data?.regex || '');

  const [commandExecutorType, setCommandExecutorType] = useState(node.data?.type || 'cmd');
  const [commandExecutorDropdownOpen, setCommandExecutorDropdownOpen] = useState(false);

  const [secretVal, setSecretVal] = useState(node.data?.secret || '');

  // Image Search states
  const [imageMode, setImageMode] = useState(node.data?.mode || 'Path');
  const [imageModeDropdownOpen, setImageModeDropdownOpen] = useState(false);
  const [imageSelector, setImageSelector] = useState(node.data?.selector || '');
  const [imageAlgo, setImageAlgo] = useState(node.data?.algo || 'tpl');
  const [screenshotType, setScreenshotType] = useState(node.data?.type || 'page');
  const [screenshotTypeDropdownOpen, setScreenshotTypeDropdownOpen] = useState(false);
  const [imageClickImage, setImageClickImage] = useState(node.data?.clickImage !== false);
  const [imageRgbEnable, setImageRgbEnable] = useState(node.data?.rgbEnable !== false);
  const [imageThreshold, setImageThreshold] = useState(node.data?.threshold || 0.1);
  const [coordinatesOutputVar, setCoordinatesOutputVar] = useState(node.data?.variableName || '');

  // Resource Status states
  const [resourcePlatform, setResourcePlatform] = useState(node.data?.platform || 'Facebook');
  const [resourcePlatformDropdownOpen, setResourcePlatformDropdownOpen] = useState(false);
  const [resourceTypeAction, setResourceTypeAction] = useState(node.data?.typeAction || 'status');
  const [resourceStatus, setResourceStatus] = useState(node.data?.status || '');
  const [resourceStatusDropdownOpen, setResourceStatusDropdownOpen] = useState(false);
  const [resourceNote, setResourceNote] = useState(node.data?.note || '');

  // Browser Request states
  const [requestMethod, setRequestMethod] = useState(node.data?.method || 'POST');
  const [requestMethodOpen, setRequestMethodOpen] = useState(false);
  const [requestUrl, setRequestUrl] = useState(node.data?.url || '');
  const [requestContentType, setRequestContentType] = useState(node.data?.contentType || 'json');
  const [requestContentTypeOpen, setRequestContentTypeOpen] = useState(false);
  const [requestTimeout, setRequestTimeout] = useState(node.data?.timeout || 10000);
  const [requestActiveTab, setRequestActiveTab] = useState('headers');
  const [requestHeaders, setRequestHeaders] = useState(node.data?.headers || '{}');
  const [requestBody, setRequestBody] = useState(node.data?.body || '{}');
  const [requestResponseType, setRequestResponseType] = useState(node.data?.responseType || 'json');
  const [requestResponseTypeOpen, setRequestResponseTypeOpen] = useState(false);
  const [requestDataPath, setRequestDataPath] = useState(node.data?.dataPath || '');
  const [requestAssignVariable, setRequestAssignVariable] = useState(node.data?.assignVariable || false);
  const [requestVariableName, setRequestVariableName] = useState(node.data?.variableName || '');
  const [requestSaveData, setRequestSaveData] = useState(node.data?.saveData || false);
  const [requestDataColumn, setRequestDataColumn] = useState(node.data?.dataColumn || '');
  const [requestDataColumnOpen, setRequestDataColumnOpen] = useState(false);

  // Wait Connections states
  const [waitTimeout, setWaitTimeout] = useState(node.data?.timeout !== undefined ? node.data.timeout : 10000);
  const [waitDelay, setWaitDelay] = useState(node.data?.delay !== undefined ? node.data.delay : 0);
  const [waitSpecificFlow, setWaitSpecificFlow] = useState(node.data?.specificFlow || false);

  // Workflow State states
  const [workflowActionType, setWorkflowActionType] = useState(node.data?.type || 'stop-current');
  const [workflowActionTypeOpen, setWorkflowActionTypeOpen] = useState(false);
  const [workflowExceptCurrent, setWorkflowExceptCurrent] = useState(node.data?.exceptCurrent || false);

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

    // Clipboard
    setClipboardType(node.data?.type || 'get');
    setAssignVariable(node.data?.assignVariable !== false);
    setVariableName(node.data?.variableName || '');
    setSaveData(node.data?.saveData || false);
    setDataColumn(node.data?.dataColumn || '');
    setDataToCopy(node.data?.dataToCopy || '');
    setCopySelectedText(node.data?.copySelectedText || false);
    setClipboardTypeDropdownOpen(false);
    setDataColumnDropdownOpen(false);

    // Command
    setCommandVal(node.data?.command || '');
    setRegexVal(node.data?.regex || '');

    setCommandExecutorType(node.data?.type || 'cmd');
    setCommandExecutorDropdownOpen(false);

    setSecretVal(node.data?.secret || '');

    // Image Search
    setImageMode(node.data?.mode || 'Path');
    setImageModeDropdownOpen(false);
    setImageSelector(node.data?.selector || '');
    setImageAlgo(node.data?.algo || 'tpl');
    setScreenshotType(node.data?.type || 'page');
    setScreenshotTypeDropdownOpen(false);
    setImageClickImage(node.data?.clickImage !== false);
    setImageRgbEnable(node.data?.rgbEnable !== false);
    setImageThreshold(node.data?.threshold || 0.1);
    setCoordinatesOutputVar(node.data?.variableName || '');

    // Resource Status
    setResourcePlatform(node.data?.platform || 'Facebook');
    setResourcePlatformDropdownOpen(false);
    setResourceTypeAction(node.data?.typeAction || 'status');
    setResourceStatus(node.data?.status || '');
    setResourceStatusDropdownOpen(false);
    setResourceNote(node.data?.note || '');

    // Browser Request
    setRequestMethod(node.data?.method || 'POST');
    setRequestMethodOpen(false);
    setRequestUrl(node.data?.url || '');
    setRequestContentType(node.data?.contentType || 'json');
    setRequestContentTypeOpen(false);
    setRequestTimeout(node.data?.timeout || 10000);
    setRequestActiveTab('headers');
    setRequestHeaders(node.data?.headers || '{}');
    setRequestBody(node.data?.body || '{}');
    setRequestResponseType(node.data?.responseType || 'json');
    setRequestResponseTypeOpen(false);
    setRequestDataPath(node.data?.dataPath || '');
    setRequestAssignVariable(node.data?.assignVariable || false);
    setRequestVariableName(node.data?.variableName || '');
    setRequestSaveData(node.data?.saveData || false);
    setRequestDataColumn(node.data?.dataColumn || '');
    setRequestDataColumnOpen(false);

    // Wait Connections
    setWaitTimeout(node.data?.timeout !== undefined ? node.data.timeout : 10000);
    setWaitDelay(node.data?.delay !== undefined ? node.data.delay : 0);
    setWaitSpecificFlow(node.data?.specificFlow || false);

    // Workflow State
    setWorkflowActionType(node.data?.type || 'stop-current');
    setWorkflowActionTypeOpen(false);
    setWorkflowExceptCurrent(node.data?.exceptCurrent || false);

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
        ) : node.label === 'clipboard' ? (
          <>
            {/* Clipboard Type Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <div
                className={styles.customSelect}
                onClick={() => setClipboardTypeDropdownOpen(!clipboardTypeDropdownOpen)}
              >
                <span>{clipboardType === 'get' ? 'Get clipboard data' : 'Insert text to clipboard'}</span>
                <span className={styles.chevron}>{clipboardTypeDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {clipboardTypeDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {[
                    { value: 'get', label: 'Get clipboard data' },
                    { value: 'set', label: 'Insert text to clipboard' }
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownOption} ${clipboardType === opt.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setClipboardType(opt.value);
                        onUpdate(node.id, 'type', opt.value);
                        setClipboardTypeDropdownOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* If GET mode */}
            {clipboardType === 'get' ? (
              <>
                {/* Assign to variable checkbox */}
                <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={assignVariable}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setAssignVariable(val);
                        onUpdate(node.id, 'assignVariable', val);
                      }}
                    />
                    <span>Assign to variable</span>
                  </label>
                </div>

                {/* Variable name input */}
                {assignVariable && (
                  <div className={styles.propsField}>
                    <input
                      type="text"
                      placeholder="Variable name"
                      value={variableName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setVariableName(val);
                        onUpdate(node.id, 'variableName', val);
                      }}
                    />
                  </div>
                )}

                {/* Insert to table checkbox */}
                <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={saveData}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setSaveData(val);
                        onUpdate(node.id, 'saveData', val);
                      }}
                    />
                    <span>Insert to table</span>
                  </label>
                </div>

                {/* Select column dropdown */}
                {saveData && (
                  <div className={styles.propsField} style={{ position: 'relative' }}>
                    <div
                      className={styles.customSelect}
                      onClick={() => setDataColumnDropdownOpen(!dataColumnDropdownOpen)}
                    >
                      <span>{dataColumn || 'Select column'}</span>
                      <span className={styles.chevron}>{dataColumnDropdownOpen ? '▲' : '▼'}</span>
                    </div>
                    {dataColumnDropdownOpen && (
                      <div className={styles.dropdownOptions}>
                        {(() => {
                          const tableColumns = workflowData?.table || [];
                          const columnsList = tableColumns.map(col => typeof col === 'string' ? col : col.name).filter(Boolean);
                          const finalColumns = columnsList.length > 0 ? columnsList : ['column1', 'column2'];
                          
                          return finalColumns.map(col => (
                            <div
                              key={col}
                              className={`${styles.dropdownOption} ${dataColumn === col ? styles.dropdownOptionSelected : ''}`}
                              onClick={() => {
                                setDataColumn(col);
                                onUpdate(node.id, 'dataColumn', col);
                                setDataColumnDropdownOpen(false);
                              }}
                            >
                              <span>{col}</span>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              /* If SET mode */
              <>
                {/* Data to copy input */}
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Data to copy</label>
                  <VariableInput
                    placeholder="Text to copy"
                    value={dataToCopy}
                    onChange={(val) => {
                      setDataToCopy(val);
                      onUpdate(node.id, 'dataToCopy', val);
                    }}
                    parameters={parameters}
                  />
                </div>

                {/* Copy selected text checkbox */}
                <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={copySelectedText}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setCopySelectedText(val);
                        onUpdate(node.id, 'copySelectedText', val);
                      }}
                    />
                    <span>Copy selected text</span>
                  </label>
                </div>
              </>
            )}

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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
          </>
        ) : node.label === 'browser-request' ? (
          <>
            {/* Request description/note field */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Description</label>
              <input
                type="text"
                placeholder="Description"
                value={node.data?.description || ''}
                onChange={(e) => onUpdate(node.id, 'description', e.target.value)}
              />
            </div>

            {/* Request Method Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Request method</label>
              <div
                className={styles.customSelect}
                onClick={() => setRequestMethodOpen(!requestMethodOpen)}
              >
                <span>{requestMethod}</span>
                <span className={styles.chevron}>{requestMethodOpen ? '▲' : '▼'}</span>
              </div>
              {requestMethodOpen && (
                <div className={styles.dropdownOptions}>
                  {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(m => (
                    <div
                      key={m}
                      className={`${styles.dropdownOption} ${requestMethod === m ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setRequestMethod(m);
                        onUpdate(node.id, 'method', m);
                        setRequestMethodOpen(false);
                      }}
                    >
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Request URL Input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Request URL*</label>
              <VariableInput
                placeholder="http://api.example.com"
                value={requestUrl}
                onChange={(val) => {
                  setRequestUrl(val);
                  onUpdate(node.id, 'url', val);
                }}
                parameters={parameters}
              />
            </div>

            {/* Content Type Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Content type</label>
              <div
                className={styles.customSelect}
                onClick={() => setRequestContentTypeOpen(!requestContentTypeOpen)}
              >
                <span>
                  {requestContentType === 'json' ? 'application/json' :
                   requestContentType === 'text' ? 'text/plain' :
                   requestContentType === 'form' ? 'multipart/form-data' :
                   requestContentType === 'urlencoded' ? 'application/x-www-form-urlencoded' : requestContentType}
                </span>
                <span className={styles.chevron}>{requestContentTypeOpen ? '▲' : '▼'}</span>
              </div>
              {requestContentTypeOpen && (
                <div className={styles.dropdownOptions}>
                  {[
                    { value: 'text', label: 'text/plain' },
                    { value: 'json', label: 'application/json' },
                    { value: 'form', label: 'multipart/form-data' },
                    { value: 'urlencoded', label: 'application/x-www-form-urlencoded' }
                  ].map(ct => (
                    <div
                      key={ct.value}
                      className={`${styles.dropdownOption} ${requestContentType === ct.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setRequestContentType(ct.value);
                        onUpdate(node.id, 'contentType', ct.value);
                        setRequestContentTypeOpen(false);
                      }}
                    >
                      <span>{ct.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Timeout */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (0 to disable)</label>
              <input
                type="number"
                value={requestTimeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setRequestTimeout(val);
                  onUpdate(node.id, 'timeout', val);
                }}
              />
            </div>

            {/* Tabs Row */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid rgba(0,0,0,0.08)',
              marginTop: '1.25rem',
              marginBottom: '1rem',
              gap: '1.5rem'
            }}>
              {['headers', 'body', 'response'].map(tab => {
                const isActive = requestActiveTab === tab;
                const label = tab.charAt(0).toUpperCase() + tab.slice(1);
                return (
                  <div
                    key={tab}
                    onClick={() => setRequestActiveTab(tab)}
                    style={{
                      paddingBottom: '8px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: isActive ? '#24292f' : '#57606a',
                      borderBottom: isActive ? '2px solid #24292f' : '2px solid transparent',
                      marginBottom: '-1px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>

            {/* Tab Contents */}
            {requestActiveTab === 'headers' && (
              <div className={styles.propsField}>
                <textarea
                  className={styles.customTextarea}
                  value={requestHeaders}
                  onChange={(e) => {
                    setRequestHeaders(e.target.value);
                    onUpdate(node.id, 'headers', e.target.value);
                  }}
                  rows={4}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {requestActiveTab === 'body' && (
              <div className={styles.propsField}>
                <textarea
                  className={styles.customTextarea}
                  value={requestBody}
                  onChange={(e) => {
                    setRequestBody(e.target.value);
                    onUpdate(node.id, 'body', e.target.value);
                  }}
                  rows={4}
                  style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}
                />
              </div>
            )}

            {requestActiveTab === 'response' && (
              <>
                {/* Data path type dropdown */}
                <div className={styles.propsField} style={{ position: 'relative' }}>
                  <label className={styles.propsFieldLabel}>Data path</label>
                  <div
                    className={styles.customSelect}
                    onClick={() => setRequestResponseTypeOpen(!requestResponseTypeOpen)}
                  >
                    <span>
                      {requestResponseType === 'json' ? 'JSON' :
                       requestResponseType === 'text' ? 'Text' :
                       requestResponseType === 'base64' ? 'Base64' : requestResponseType}
                    </span>
                    <span className={styles.chevron}>{requestResponseTypeOpen ? '▲' : '▼'}</span>
                  </div>
                  {requestResponseTypeOpen && (
                    <div className={styles.dropdownOptions}>
                      {[
                        { value: 'json', label: 'JSON' },
                        { value: 'text', label: 'Text' },
                        { value: 'base64', label: 'Base64' }
                      ].map(rt => (
                        <div
                          key={rt.value}
                          className={`${styles.dropdownOption} ${requestResponseType === rt.value ? styles.dropdownOptionSelected : ''}`}
                          onClick={() => {
                            setRequestResponseType(rt.value);
                            onUpdate(node.id, 'responseType', rt.value);
                            setRequestResponseTypeOpen(false);
                          }}
                        >
                          <span>{rt.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Data path text input */}
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Data path</label>
                  <VariableInput
                    placeholder="path.to.data"
                    value={requestDataPath}
                    onChange={(val) => {
                      setRequestDataPath(val);
                      onUpdate(node.id, 'dataPath', val);
                    }}
                    parameters={parameters}
                  />
                </div>

                {/* Assign to variable checkbox */}
                <div style={{ margin: '0.75rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requestAssignVariable}
                      onChange={(e) => {
                        setRequestAssignVariable(e.target.checked);
                        onUpdate(node.id, 'assignVariable', e.target.checked);
                      }}
                    />
                    <span>Assign to variable</span>
                  </label>
                </div>

                {requestAssignVariable && (
                  <div className={styles.propsField} style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(0,0,0,0.06)' }}>
                    <label className={styles.propsFieldLabel}>Variable name</label>
                    <VariableInput
                      placeholder="Variable Name"
                      value={requestVariableName}
                      onChange={(val) => {
                        setRequestVariableName(val);
                        onUpdate(node.id, 'variableName', val);
                      }}
                      parameters={parameters}
                    />
                  </div>
                )}

                {/* Insert to table checkbox */}
                <div style={{ margin: '0.75rem 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={requestSaveData}
                      onChange={(e) => {
                        setRequestSaveData(e.target.checked);
                        onUpdate(node.id, 'saveData', e.target.checked);
                      }}
                    />
                    <span>Insert to table</span>
                  </label>
                </div>

                {requestSaveData && (
                  <div className={styles.propsField} style={{ paddingLeft: '1rem', borderLeft: '2px solid rgba(0,0,0,0.06)', position: 'relative' }}>
                    <label className={styles.propsFieldLabel}>Select column</label>
                    <div
                      className={styles.customSelect}
                      onClick={() => setRequestDataColumnOpen(!requestDataColumnOpen)}
                    >
                      <span>{requestDataColumn || 'Select column'}</span>
                      <span className={styles.chevron}>{requestDataColumnOpen ? '▲' : '▼'}</span>
                    </div>
                    {requestDataColumnOpen && (
                      <div className={styles.dropdownOptions}>
                        {(workflowData?.table || []).map(col => (
                          <div
                            key={col.id}
                            className={`${styles.dropdownOption} ${requestDataColumn === col.name ? styles.dropdownOptionSelected : ''}`}
                            onClick={() => {
                              setRequestDataColumn(col.name);
                              onUpdate(node.id, 'dataColumn', col.name);
                              setRequestDataColumnOpen(false);
                            }}
                          >
                            <span>{col.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        ) : node.label === 'wait-connections' ? (
          <>
            {/* Description */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel} style={{ color: 'rgba(0,0,0,0.4)', fontStyle: 'italic' }}>Description</label>
              <input
                type="text"
                placeholder="Description"
                value={node.data?.description || ''}
                onChange={(e) => onUpdate(node.id, 'description', e.target.value)}
              />
            </div>

            {/* Timeout (with variable input) */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel} style={{ color: '#e6a817' }}>Timeout (milliseconds)</label>
              <VariableInput
                placeholder="10000"
                value={String(waitTimeout)}
                onChange={(val) => {
                  const parsed = parseInt(val, 10);
                  const v = isNaN(parsed) ? val : parsed;
                  setWaitTimeout(v);
                  onUpdate(node.id, 'timeout', v);
                }}
                parameters={parameters}
              />
            </div>

            {/* Only continue a specific flow checkbox */}
            <div style={{ margin: '0.75rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={waitSpecificFlow}
                  onChange={(e) => {
                    setWaitSpecificFlow(e.target.checked);
                    onUpdate(node.id, 'specificFlow', e.target.checked);
                  }}
                />
                <span>Only continue a specific flow</span>
              </label>
            </div>

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

            {/* Timeout input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Timeout (millisecond)</label>
              <input
                type="number"
                value={waitTimeout}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setWaitTimeout(val);
                  onUpdate(node.id, 'timeout', val);
                }}
              />
            </div>

            {/* Delay time input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Delay time (millisecond)</label>
              <input
                type="number"
                value={waitDelay}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setWaitDelay(val);
                  onUpdate(node.id, 'delay', val);
                }}
              />
            </div>
          </>
        ) : node.label === 'workflow-state' ? (
          <>
            {/* Divider below global description */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Action Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Action</label>
              <div
                className={styles.customSelect}
                onClick={() => setWorkflowActionTypeOpen(!workflowActionTypeOpen)}
              >
                <span>
                  {workflowActionType === 'stop-all' ? 'Stop all workflows' :
                   workflowActionType === 'stop-current' ? 'Stop current workflow' :
                   workflowActionType === 'stop-specific' ? 'Stop specific workflows' : workflowActionType}
                </span>
                <span className={styles.chevron}>{workflowActionTypeOpen ? '▲' : '▼'}</span>
              </div>
              {workflowActionTypeOpen && (
                <div className={styles.dropdownOptions}>
                  {/* Category Header */}
                  <div style={{
                    padding: '8px 12px 4px',
                    fontSize: '0.78rem',
                    fontWeight: 'bold',
                    color: '#24292f',
                    backgroundColor: '#f6f8fa',
                    borderBottom: '1px solid rgba(0,0,0,0.04)'
                  }}>
                    Stop workflows
                  </div>
                  {[
                    { value: 'stop-all', label: 'Stop all workflows' },
                    { value: 'stop-current', label: 'Stop current workflow' },
                    { value: 'stop-specific', label: 'Stop specific workflows' }
                  ].map(act => (
                    <div
                      key={act.value}
                      className={`${styles.dropdownOption} ${workflowActionType === act.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setWorkflowActionType(act.value);
                        onUpdate(node.id, 'type', act.value);
                        setWorkflowActionTypeOpen(false);
                      }}
                      style={{ paddingLeft: '20px' }}
                    >
                      <span>{act.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* If stop-specific is selected, show extra fields */}
            {workflowActionType === 'stop-specific' && (
              <div style={{ marginTop: '0.75rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(0,0,0,0.06)' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={workflowExceptCurrent}
                    onChange={(e) => {
                      setWorkflowExceptCurrent(e.target.checked);
                      onUpdate(node.id, 'exceptCurrent', e.target.checked);
                    }}
                  />
                  <span>Except current workflow</span>
                </label>
              </div>
            )}

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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
          </>
        ) : node.label === 'resource-status' ? (
          <>
            {/* Resource type dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Resource type</label>
              <div
                className={styles.customSelect}
                onClick={() => setResourcePlatformDropdownOpen(!resourcePlatformDropdownOpen)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {(() => {
                    const platformLogos = {
                      Facebook: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877f2" style={{ display: 'block' }}>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      ),
                      Tiktok: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#000000" style={{ display: 'block' }}>
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08-.07-.17-.14-.24-.22v6.52c.04 2.1-.55 4.31-2.07 5.79-1.52 1.52-3.8 2.21-5.94 1.9-2.14-.31-4.14-1.78-4.94-3.85-.92-2.38-.45-5.26 1.38-7.14 1.63-1.68 4.22-2.31 6.42-1.54v4.07c-1.39-.51-3.05-.17-4.04.89-.99 1.06-1.12 2.87-.27 4.02.85 1.15 2.5 1.61 3.82.99 1.15-.54 1.79-1.85 1.75-3.13V.02z"/>
                        </svg>
                      ),
                      Youtube: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ff0000" style={{ display: 'block' }}>
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      ),
                      Shopee: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ee4d2d" style={{ display: 'block' }}>
                          <path d="M19.043 7.828h-2.196v-.375c0-2.61-2.124-4.733-4.734-4.733-2.611 0-4.734 2.123-4.734 4.733v.375H5.187C4.195 7.828 3.39 8.634 3.39 9.625l.893 10.602c0 .991.805 1.796 1.797 1.796h12.067c.992 0 1.797-.805 1.797-1.796l.893-10.602c.005-.991-.8-1.797-1.794-1.797zM9.013 7.453c0-1.71 1.391-3.1 3.101-3.1s3.101 1.39 3.101 3.1v.375H9.013v-.375zm3.101 10.222c-1.528 0-2.766-1.238-2.766-2.766s1.238-2.766 2.766-2.766 2.766 1.238 2.766 2.766-1.238 2.766-2.766 2.766z"/>
                        </svg>
                      ),
                      Instagram: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#e1306c" style={{ display: 'block' }}>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                      ),
                      Twitter: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1da1f2" style={{ display: 'block' }}>
                          <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 0 0-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 0 0-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 0 1-2.228-.616v.06a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.212.085 4.936 4.936 0 0 0 4.604 3.417 9.867 9.867 0 0 1-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0 0 7.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0 0 24 4.59z"/>
                        </svg>
                      ),
                      Telegram: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#0088cc" style={{ display: 'block' }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .32z"/>
                        </svg>
                      ),
                      Zalo: (
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
                          <rect width="24" height="24" rx="4" fill="#0068ff"/>
                          <text x="12" y="15" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="8" fill="#ffffff" text-anchor="middle">Zalo</text>
                        </svg>
                      ),
                      Google: (
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      ),
                      Outlook: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#0078d4" style={{ display: 'block' }}>
                          <path d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 11L3 5h18l-9 6zm-9 8V8l9 5.25L21 8v11H3z"/>
                        </svg>
                      )
                    };
                    return platformLogos[resourcePlatform] || null;
                  })()}
                  <span>{resourcePlatform}</span>
                </div>
                <span className={styles.chevron}>{resourcePlatformDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {resourcePlatformDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {(() => {
                    const platformLogos = {
                      Facebook: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1877f2" style={{ display: 'block' }}>
                          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                        </svg>
                      ),
                      Tiktok: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#000000" style={{ display: 'block' }}>
                          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.17-2.86-.74-3.99-1.72-.08-.07-.17-.14-.24-.22v6.52c.04 2.1-.55 4.31-2.07 5.79-1.52 1.52-3.8 2.21-5.94 1.9-2.14-.31-4.14-1.78-4.94-3.85-.92-2.38-.45-5.26 1.38-7.14 1.63-1.68 4.22-2.31 6.42-1.54v4.07c-1.39-.51-3.05-.17-4.04.89-.99 1.06-1.12 2.87-.27 4.02.85 1.15 2.5 1.61 3.82.99 1.15-.54 1.79-1.85 1.75-3.13V.02z"/>
                        </svg>
                      ),
                      Youtube: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ff0000" style={{ display: 'block' }}>
                          <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.11C19.518 3.545 12 3.545 12 3.545s-7.518 0-9.388.507a3.003 3.003 0 0 0-2.11 2.11C0 8.033 0 12 0 12s0 3.967.502 5.837a3.003 3.003 0 0 0 2.11 2.11c1.87.507 9.388.507 9.388.507s7.518 0 9.388-.507a3.003 3.003 0 0 0 2.11-2.11C24 15.967 24 12 24 12s0-3.967-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                        </svg>
                      ),
                      Shopee: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#ee4d2d" style={{ display: 'block' }}>
                          <path d="M19.043 7.828h-2.196v-.375c0-2.61-2.124-4.733-4.734-4.733-2.611 0-4.734 2.123-4.734 4.733v.375H5.187C4.195 7.828 3.39 8.634 3.39 9.625l.893 10.602c0 .991.805 1.796 1.797 1.796h12.067c.992 0 1.797-.805 1.797-1.796l.893-10.602c.005-.991-.8-1.797-1.794-1.797zM9.013 7.453c0-1.71 1.391-3.1 3.101-3.1s3.101 1.39 3.101 3.1v.375H9.013v-.375zm3.101 10.222c-1.528 0-2.766-1.238-2.766-2.766s1.238-2.766 2.766-2.766 2.766 1.238 2.766 2.766-1.238 2.766-2.766 2.766z"/>
                        </svg>
                      ),
                      Instagram: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#e1306c" style={{ display: 'block' }}>
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.051.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                        </svg>
                      ),
                      Twitter: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#1da1f2" style={{ display: 'block' }}>
                          <path d="M23.953 4.57a10 10 0 0 1-2.825.775 4.958 4.958 0 0 0 2.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 0 0-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 0 0-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 0 1-2.228-.616v.06a4.923 4.923 0 0 0 3.946 4.827 4.996 4.996 0 0 1-2.212.085 4.936 4.936 0 0 0 4.604 3.417 9.867 9.867 0 0 1-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 0 0 7.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0 0 24 4.59z"/>
                        </svg>
                      ),
                      Telegram: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#0088cc" style={{ display: 'block' }}>
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-1-.65-.35-1 .22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 0 0-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.75-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .32z"/>
                        </svg>
                      ),
                      Zalo: (
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
                          <rect width="24" height="24" rx="4" fill="#0068ff"/>
                          <text x="12" y="15" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="8" fill="#ffffff" text-anchor="middle">Zalo</text>
                        </svg>
                      ),
                      Google: (
                        <svg viewBox="0 0 24 24" width="16" height="16" style={{ display: 'block' }}>
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
                        </svg>
                      ),
                      Outlook: (
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="#0078d4" style={{ display: 'block' }}>
                          <path d="M21 2H3c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM12 11L3 5h18l-9 6zm-9 8V8l9 5.25L21 8v11H3z"/>
                        </svg>
                      )
                    };
                    return (
                      <>
                        {[
                          { value: 'Facebook', label: 'Facebook' },
                          { value: 'Tiktok', label: 'Tiktok' },
                          { value: 'Youtube', label: 'Youtube' },
                          { value: 'Shopee', label: 'Shopee' },
                          { value: 'Instagram', label: 'Instagram' },
                          { value: 'Twitter', label: 'Twitter' },
                          { value: 'Telegram', label: 'Telegram' },
                          { value: 'Zalo', label: 'Zalo' },
                          { value: 'Google', label: 'Google' },
                          { value: 'Outlook', label: 'Outlook' }
                        ].map(opt => (
                          <div
                            key={opt.value}
                            className={`${styles.dropdownOption} ${resourcePlatform === opt.value ? styles.dropdownOptionSelected : ''}`}
                            onClick={() => {
                              setResourcePlatform(opt.value);
                              onUpdate(node.id, 'platform', opt.value);
                              setResourcePlatformDropdownOpen(false);
                            }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                              {platformLogos[opt.value]}
                            </div>
                            <span style={{ color: '#24292f', fontSize: '0.85rem' }}>{opt.label}</span>
                          </div>
                        ))}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Status / Resource radio buttons */}
            <div style={{ display: 'flex', gap: '1.5rem', margin: '0.75rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="resourceTypeAction"
                  checked={resourceTypeAction === 'status'}
                  onChange={() => {
                    setResourceTypeAction('status');
                    onUpdate(node.id, 'typeAction', 'status');
                  }}
                />
                <span>Status</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="resourceTypeAction"
                  checked={resourceTypeAction === 'resource'}
                  onChange={() => {
                    setResourceTypeAction('resource');
                    onUpdate(node.id, 'typeAction', 'resource');
                  }}
                />
                <span>Resource</span>
              </label>
            </div>

            {/* Status type dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Status type</label>
              <div
                className={styles.customSelect}
                onClick={() => setResourceStatusDropdownOpen(!resourceStatusDropdownOpen)}
              >
                <span>{resourceStatus || 'Select'}</span>
                <span className={styles.chevron}>{resourceStatusDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {resourceStatusDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {['Active', 'Inactive', 'Invalid', 'Unknown'].map(st => (
                    <div
                      key={st}
                      className={`${styles.dropdownOption} ${resourceStatus === st ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setResourceStatus(st);
                        onUpdate(node.id, 'status', st);
                        setResourceStatusDropdownOpen(false);
                      }}
                    >
                      <span>{st}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Note type text input with variable picker */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Note type</label>
              <VariableInput
                placeholder="Platform status note"
                value={resourceNote}
                onChange={(val) => {
                  setResourceNote(val);
                  onUpdate(node.id, 'note', val);
                }}
                parameters={parameters}
              />
            </div>

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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

            {/* On Error Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>On error</h4>
            <div className={styles.propsField}>
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
        ) : node.label === 'image-search' ? (
          <>
            {/* Image Search Mode Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <div
                className={styles.customSelect}
                onClick={() => setImageModeDropdownOpen(!imageModeDropdownOpen)}
              >
                <span>{imageMode || 'Path'}</span>
                <span className={styles.chevron}>{imageModeDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {imageModeDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {['Path', 'Base64'].map(m => (
                    <div
                      key={m}
                      className={`${styles.dropdownOption} ${imageMode === m ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setImageMode(m);
                        onUpdate(node.id, 'mode', m);
                        setImageModeDropdownOpen(false);
                      }}
                    >
                      <span>{m}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Path of input image with inline picture & variable buttons */}
            <div className={styles.propsField}>
              <VariableInput
                placeholder="path of input image"
                value={imageSelector}
                onChange={(val) => {
                  setImageSelector(val);
                  onUpdate(node.id, 'selector', val);
                }}
                parameters={parameters}
                showImageButton={true}
              />
            </div>

            {/* Algorithm radio buttons */}
            <div style={{ display: 'flex', gap: '1.5rem', margin: '0.75rem 0' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="imageAlgo"
                  checked={imageAlgo === 'tpl'}
                  onChange={() => {
                    setImageAlgo('tpl');
                    onUpdate(node.id, 'algo', 'tpl');
                  }}
                />
                <span>Tpl</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="imageAlgo"
                  checked={imageAlgo === 'kaze'}
                  onChange={() => {
                    setImageAlgo('kaze');
                    onUpdate(node.id, 'algo', 'kaze');
                  }}
                />
                <span>Kaze</span>
              </label>
            </div>

            {/* Take a screenshot of dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <label className={styles.propsFieldLabel}>Take a screenshot of</label>
              <div
                className={styles.customSelect}
                onClick={() => setScreenshotTypeDropdownOpen(!screenshotTypeDropdownOpen)}
              >
                <span>
                  {screenshotType === 'page' ? 'A page' : 
                   screenshotType === 'fullPage' ? 'A full page' : 'An element'}
                </span>
                <span className={styles.chevron}>{screenshotTypeDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {screenshotTypeDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {[
                    { value: 'page', label: 'A page' },
                    { value: 'fullPage', label: 'A full page' },
                    { value: 'element', label: 'An element' }
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownOption} ${screenshotType === opt.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setScreenshotType(opt.value);
                        onUpdate(node.id, 'type', opt.value);
                        setScreenshotTypeDropdownOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Checkboxes row */}
            <div style={{ display: 'flex', gap: '1.5rem', margin: '0.75rem 0' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={imageClickImage}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setImageClickImage(val);
                    onUpdate(node.id, 'clickImage', val);
                  }}
                />
                <span>Click Image</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={imageRgbEnable}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setImageRgbEnable(val);
                    onUpdate(node.id, 'rgbEnable', val);
                  }}
                />
                <span>RGB Enable</span>
              </label>
            </div>

            {/* Threshold slider */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Threshold {imageThreshold}</label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={imageThreshold}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setImageThreshold(val);
                  onUpdate(node.id, 'threshold', val);
                }}
                style={{ width: '100%', accentColor: '#2ea043' }}
              />
            </div>

            {/* Coordinates Output Variables text input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Coordinates Output Variables</label>
              <input
                type="text"
                placeholder="Variable Name"
                value={coordinatesOutputVar}
                onChange={(e) => {
                  const val = e.target.value;
                  setCoordinatesOutputVar(val);
                  onUpdate(node.id, 'variableName', val);
                }}
              />
            </div>

            {/* Image / Capture buttons */}
            <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  backgroundColor: '#1b1f23',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Image
              </button>
              <button
                type="button"
                style={{
                  flex: 1,
                  padding: '0.65rem',
                  backgroundColor: '#1b1f23',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Capture
              </button>
            </div>

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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

            {/* On Error Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>On error</h4>
            <div className={styles.propsField}>
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
        ) : node.label === 'generate-2fa' ? (
          <>
            {/* Secret key input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Generate 2FA</label>
              <VariableInput
                placeholder="Enter your 2FA secret key"
                value={secretVal}
                onChange={(val) => {
                  setSecretVal(val);
                  onUpdate(node.id, 'secret', val);
                }}
                parameters={parameters}
              />
            </div>

            {/* Assign to variable checkbox */}
            <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={assignVariable}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAssignVariable(val);
                    onUpdate(node.id, 'assignVariable', val);
                  }}
                />
                <span>Assign to variable</span>
              </label>
            </div>

            {/* Variable name input */}
            {assignVariable && (
              <div className={styles.propsField}>
                <label className={styles.propsFieldLabel}>Variable name</label>
                <input
                  type="text"
                  placeholder="Variable name"
                  value={variableName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setVariableName(val);
                    onUpdate(node.id, 'variableName', val);
                  }}
                />
              </div>
            )}

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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

            {/* On Error Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>On error</h4>
            <div className={styles.propsField}>
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
        ) : node.label === 'commandPro' ? (
          <>
            {/* Command Executor Type Dropdown */}
            <div className={styles.propsField} style={{ position: 'relative' }}>
              <div
                className={styles.customSelect}
                onClick={() => setCommandExecutorDropdownOpen(!commandExecutorDropdownOpen)}
              >
                <span>
                  {commandExecutorType === 'cmd' ? 'Cmd' : 
                   commandExecutorType === 'terminal' ? 'Terminal' : 'PowerShell'}
                </span>
                <span className={styles.chevron}>{commandExecutorDropdownOpen ? '▲' : '▼'}</span>
              </div>
              {commandExecutorDropdownOpen && (
                <div className={styles.dropdownOptions}>
                  {[
                    { value: 'cmd', label: 'Cmd' },
                    { value: 'terminal', label: 'Terminal' },
                    { value: 'powershell', label: 'PowerShell' }
                  ].map(opt => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownOption} ${commandExecutorType === opt.value ? styles.dropdownOptionSelected : ''}`}
                      onClick={() => {
                        setCommandExecutorType(opt.value);
                        onUpdate(node.id, 'type', opt.value);
                        setCommandExecutorDropdownOpen(false);
                      }}
                    >
                      <span>{opt.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Command text input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Command</label>
              <VariableInput
                placeholder=""
                value={commandVal}
                onChange={(val) => {
                  setCommandVal(val);
                  onUpdate(node.id, 'command', val);
                }}
                isTextarea={true}
                parameters={parameters}
              />
            </div>

            {/* Assign to variable checkbox */}
            <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={assignVariable}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAssignVariable(val);
                    onUpdate(node.id, 'assignVariable', val);
                  }}
                />
                <span>Assign to variable</span>
              </label>
            </div>

            {/* Variable name & Regex inputs */}
            {assignVariable && (
              <>
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Variable name</label>
                  <input
                    type="text"
                    placeholder="Variable name"
                    value={variableName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVariableName(val);
                      onUpdate(node.id, 'variableName', val);
                    }}
                  />
                </div>
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Regular expression (Regex)</label>
                  <input
                    type="text"
                    placeholder="e.g. \d+"
                    value={regexVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegexVal(val);
                      onUpdate(node.id, 'regex', val);
                    }}
                  />
                </div>
              </>
            )}

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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

            {/* On Error Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>On error</h4>
            <div className={styles.propsField}>
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
        ) : (node.label === 'command' || node.label === 'power-shell') ? (
          <>
            {/* Command text input */}
            <div className={styles.propsField}>
              <label className={styles.propsFieldLabel}>Command</label>
              <VariableInput
                placeholder="echo Hello World"
                value={commandVal}
                onChange={(val) => {
                  setCommandVal(val);
                  onUpdate(node.id, 'command', val);
                }}
                isTextarea={true}
                parameters={parameters}
              />
            </div>

            {/* Assign to variable checkbox */}
            <div className={styles.checkboxGroup} style={{ marginTop: '0.75rem' }}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={assignVariable}
                  onChange={(e) => {
                    const val = e.target.checked;
                    setAssignVariable(val);
                    onUpdate(node.id, 'assignVariable', val);
                  }}
                />
                <span>Assign to variable</span>
              </label>
            </div>

            {/* Variable name & Regex inputs */}
            {assignVariable && (
              <>
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Variable name</label>
                  <input
                    type="text"
                    placeholder="Variable name"
                    value={variableName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setVariableName(val);
                      onUpdate(node.id, 'variableName', val);
                    }}
                  />
                </div>
                <div className={styles.propsField}>
                  <label className={styles.propsFieldLabel}>Regular expression (Regex)</label>
                  <input
                    type="text"
                    placeholder="e.g. \d+"
                    value={regexVal}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegexVal(val);
                      onUpdate(node.id, 'regex', val);
                    }}
                  />
                </div>
              </>
            )}

            {/* Divider */}
            <div style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', margin: '1rem 0' }} />

            {/* Settings Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>Settings</h4>

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

            {/* On Error Section */}
            <h4 className={styles.sectionHeader} style={{ borderTop: 'none', paddingTop: 0, marginTop: 0 }}>On error</h4>
            <div className={styles.propsField}>
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
  const [draggingNested, setDraggingNested] = useState(null);

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

  // --- Nested block dragging out ---
  const handleNestedDragStart = useCallback((groupId, blockId, e) => {
    e.stopPropagation();
    e.preventDefault();
    const svgPos = screenToSvg(e.clientX, e.clientY);
    setDraggingNested({
      groupId,
      blockId,
      startX: svgPos.x,
      startY: svgPos.y,
      currentX: svgPos.x,
      currentY: svgPos.y
    });
  }, [screenToSvg]);

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

    if (draggingNested) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      setDraggingNested(prev => prev ? {
        ...prev,
        currentX: svgPos.x,
        currentY: svgPos.y
      } : null);
    }
  }, [isPanning, panStart, draggingNode, dragOffset, connecting, draggingNested, screenToSvg]);

  // --- Mouse up (finish pan, drag, or connection) ---
  const handleMouseUp = useCallback((e) => {
    if (isPanning) {
      setIsPanning(false);
    }

    if (draggingNode) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const nodes = workflowData?.drawflow?.nodes || [];
      const draggedNode = nodes.find(n => n.id === draggingNode);
      
      if (draggedNode && draggedNode.label !== 'blocks-group' && draggedNode.label !== 'trigger' && draggedNode.label !== 'end') {
        const groupNode = nodes.find(n => {
          if (n.label !== 'blocks-group') return false;
          const groupBlocks = n.data?.blocks || [];
          const groupHeight = 90 + groupBlocks.length * 30 + 42;
          return (
            svgPos.x >= n.position.x &&
            svgPos.x <= n.position.x + BLOCK_WIDTH &&
            svgPos.y >= n.position.y &&
            svgPos.y <= n.position.y + groupHeight
          );
        });

        if (groupNode) {
          // Move node into group
          setWorkflowData(prev => {
            if (!prev) return prev;
            const newData = JSON.parse(JSON.stringify(prev));
            const nodeToMove = newData.drawflow.nodes.find(n => n.id === draggingNode);
            const targetGroup = newData.drawflow.nodes.find(n => n.id === groupNode.id);
            if (nodeToMove && targetGroup) {
              if (!targetGroup.data.blocks) targetGroup.data.blocks = [];
              targetGroup.data.blocks.push({
                id: nodeToMove.id,
                label: nodeToMove.label,
                data: nodeToMove.data
              });
              newData.drawflow.nodes = newData.drawflow.nodes.filter(n => n.id !== draggingNode);
              newData.drawflow.edges = newData.drawflow.edges.filter(
                e => e.source !== draggingNode && e.target !== draggingNode
              );
            }
            return newData;
          });
          setSelectedNode(prev => prev?.id === draggingNode ? null : prev);
        }
      }
      setDraggingNode(null);
    }

    if (draggingNested) {
      const svgPos = screenToSvg(e.clientX, e.clientY);
      const { groupId, blockId, startX, startY } = draggingNested;
      const dist = Math.sqrt((svgPos.x - startX) ** 2 + (svgPos.y - startY) ** 2);
      
      const nodes = workflowData?.drawflow?.nodes || [];
      const groupNode = nodes.find(n => n.id === groupId);
      
      if (groupNode) {
        const groupBlocks = groupNode.data?.blocks || [];
        const groupHeight = 90 + groupBlocks.length * 30 + 42;
        
        const isInside = (
          svgPos.x >= groupNode.position.x &&
          svgPos.x <= groupNode.position.x + BLOCK_WIDTH &&
          svgPos.y >= groupNode.position.y &&
          svgPos.y <= groupNode.position.y + groupHeight
        );

        if (!isInside || dist > 40) {
          setWorkflowData(prev => {
            if (!prev) return prev;
            const newData = JSON.parse(JSON.stringify(prev));
            const targetGroup = newData.drawflow.nodes.find(n => n.id === groupId);
            if (targetGroup && targetGroup.data?.blocks) {
              const blockToRemove = targetGroup.data.blocks.find(b => b.id === blockId);
              if (blockToRemove) {
                const restoredNode = {
                  id: blockToRemove.id,
                  type: 'BlockBasicWithFallback',
                  initialized: false,
                  position: {
                    x: svgPos.x - BLOCK_WIDTH / 2,
                    y: svgPos.y - BLOCK_HEIGHT / 2
                  },
                  data: blockToRemove.data,
                  label: blockToRemove.label
                };
                
                targetGroup.data.blocks = targetGroup.data.blocks.filter(b => b.id !== blockId);
                newData.drawflow.nodes.push(restoredNode);
              }
            }
            return newData;
          });
        }
      }
      setDraggingNested(null);
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
  }, [isPanning, draggingNode, connecting, draggingNested, screenToSvg, workflowData, scale]);

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

  // --- Move node to group ---
  const handleMoveToGroup = useCallback((nodeId) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      const nodeToMove = newData.drawflow.nodes.find(n => n.id === nodeId);
      if (!nodeToMove) return prev;

      const groupNode = newData.drawflow.nodes.find(n => n.label === 'blocks-group');
      if (!groupNode) {
        alert("Please add a Blocks Group node first!");
        return prev;
      }

      if (!groupNode.data.blocks) groupNode.data.blocks = [];
      groupNode.data.blocks.push({
        id: nodeToMove.id,
        label: nodeToMove.label,
        data: nodeToMove.data
      });

      newData.drawflow.nodes = newData.drawflow.nodes.filter(n => n.id !== nodeId);
      newData.drawflow.edges = newData.drawflow.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );

      return newData;
    });
    setSelectedNode(prev => prev?.id === nodeId ? null : prev);
  }, []);

  // --- Move node from group ---
  const handleMoveFromGroup = useCallback((groupId, blockId) => {
    setWorkflowData(prev => {
      if (!prev) return prev;
      const newData = JSON.parse(JSON.stringify(prev));
      const groupNode = newData.drawflow.nodes.find(n => n.id === groupId);
      if (!groupNode || !groupNode.data?.blocks) return prev;

      const blockToRemove = groupNode.data.blocks.find(b => b.id === blockId);
      if (!blockToRemove) return prev;

      const restoredNode = {
        id: blockToRemove.id,
        type: 'BlockBasicWithFallback',
        initialized: false,
        position: {
          x: groupNode.position.x + 40,
          y: groupNode.position.y + 125 + (groupNode.data.blocks.length * 35)
        },
        data: blockToRemove.data,
        label: blockToRemove.label
      };

      groupNode.data.blocks = groupNode.data.blocks.filter(b => b.id !== blockId);
      newData.drawflow.nodes.push(restoredNode);

      return newData;
    });
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
                onMoveToGroup={handleMoveToGroup}
                onMoveFromGroup={handleMoveFromGroup}
                onNestedDragStart={handleNestedDragStart}
                onUpdate={handleFieldUpdate}
              />
            ))}

            {/* Ghost block for dragged nested item */}
            {draggingNested && (() => {
              const nodes = workflowData?.drawflow?.nodes || [];
              const groupNode = nodes.find(n => n.id === draggingNested.groupId);
              const block = groupNode?.data?.blocks?.find(b => b.id === draggingNested.blockId);
              if (!block) return null;
              const bIcon = getIcon(block.data?.icon, block.label);
              const bLabel = getLabel(block.label);
              
              return (
                <g transform={`translate(${draggingNested.currentX - BLOCK_WIDTH / 2}, ${draggingNested.currentY - BLOCK_HEIGHT / 2})`} style={{ pointerEvents: 'none', opacity: 0.85 }}>
                  <rect
                    x={2} y={3}
                    width={BLOCK_WIDTH} height={BLOCK_HEIGHT}
                    rx={12} ry={12}
                    fill="rgba(0,0,0,0.08)"
                  />
                  <rect
                    x={0} y={0}
                    width={BLOCK_WIDTH} height={BLOCK_HEIGHT}
                    rx={12} ry={12}
                    fill="#ffffff"
                    stroke="#58a6ff"
                    strokeWidth={2}
                  />
                  <rect
                    x={14} y={12}
                    width={36} height={36}
                    rx={10} ry={10}
                    fill={bIcon.bgColor}
                  />
                  <text x={32} y={36} textAnchor="middle" fontSize={18} fill={bIcon.color}>
                    {bIcon.emoji}
                  </text>
                  <text x={60} y={36} fontSize={14} fontWeight={600} fill="#1a1a1a">
                    {bLabel}
                  </text>
                </g>
              );
            })()}
          </g>
        </svg>
      </div>

      <PropertiesPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdate={handleFieldUpdate}
        onOpenParameters={() => setShowParametersModal(true)}
        parameters={workflowData?.drawflow?.nodes?.find(n => n.label === 'trigger')?.data?.parameters || []}
        workflowData={workflowData}
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
