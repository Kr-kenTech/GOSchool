// ==========================================
// GOSchool — Desperdício (JavaScript Module)
// Gráficos nativos Canvas API (sem Chart.js)
// ==========================================

/**
 * Desenha gráfico de linha nativo usando Canvas API
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Object} dados - { labels: string[], data: number[] }
 */
function desenharGraficoLinha(canvas, dados) {
    const ctx = canvas.getContext('2d');
    const labels = dados.labels || [];
    const values = dados.data || [];

    // Ajustar resolução para displays de alta densidade
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Limpar canvas
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const padding = 50;
    const chartWidth = cssWidth - 2 * padding;
    const chartHeight = cssHeight - 2 * padding;

    if (labels.length === 0 || values.length === 0) {
        desenharEstadoVazio(ctx, cssWidth, cssHeight, 'Sem dados para exibir');
        return;
    }

    const maxValue = Math.max(...values, 1);
    const minValue = Math.min(...values);
    const valueRange = maxValue - minValue || 1;

    // Cores do design system
    const primaryColor = getCSSVar('--gs-primary', '#7c3aed');
    const textColor = getCSSVar('--gs-text-secondary', '#64748b');
    const gridColor = getCSSVar('--gs-border', '#e2e8f0');

    // Desenhar grade horizontal
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;

    for (let i = 0; i <= 4; i++) {
        const y = padding + (chartHeight / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(cssWidth - padding, y);
        ctx.stroke();

        // Labels Y
        const val = maxValue - (valueRange / 4) * i;
        ctx.font = '11px var(--gs-font-sans)';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';
        ctx.fillText(val.toFixed(1), padding - 8, y + 4);
    }

    // Linhas verticais e labels X
    for (let i = 0; i < labels.length; i++) {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, cssHeight - padding);
        ctx.stroke();

        ctx.font = '11px var(--gs-font-sans)';
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.fillText(labels[i], x, cssHeight - padding + 20);
    }

    // Desenhar área preenchida
    ctx.beginPath();
    ctx.moveTo(padding, cssHeight - padding);

    values.forEach((val, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        const y = cssHeight - padding - ((val - minValue) / valueRange) * chartHeight;
        ctx.lineTo(x, y);
    });

    ctx.lineTo(padding + chartWidth, cssHeight - padding);
    ctx.closePath();

    // Gradient para preenchimento
    const gradient = ctx.createLinearGradient(0, padding, 0, cssHeight - padding);
    gradient.addColorStop(0, hexToRgba(primaryColor, 0.15));
    gradient.addColorStop(1, hexToRgba(primaryColor, 0));
    ctx.fillStyle = gradient;
    ctx.fill();

    // Desenhar linha
    ctx.beginPath();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    values.forEach((val, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        const y = cssHeight - padding - ((val - minValue) / valueRange) * chartHeight;
        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }
    });
    ctx.stroke();

    // Desenhar pontos
    ctx.fillStyle = primaryColor;
    values.forEach((val, i) => {
        const x = padding + (chartWidth / (labels.length - 1 || 1)) * i;
        const y = cssHeight - padding - ((val - minValue) / valueRange) * chartHeight;
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();

        // Ponto branco interno
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(x, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = primaryColor;
    });
}

/**
 * Desenha gráfico de rosca nativo usando Canvas API
 * @param {HTMLCanvasElement} canvas - Elemento canvas
 * @param {Object} dados - { labels: string[], data: number[] }
 */
function desenharGraficoRosca(canvas, dados) {
    const ctx = canvas.getContext('2d');
    const labels = dados.labels || [];
    const values = dados.data || [];

    // Ajustar resolução
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const cssWidth = rect.width;
    const cssHeight = rect.height;

    // Limpar canvas
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const centerX = cssWidth / 2;
    const centerY = cssHeight / 2;
    const radius = Math.min(centerX, centerY) - 30;
    const innerRadius = radius * 0.6;

    if (labels.length === 0 || values.length === 0) {
        desenharEstadoVazio(ctx, cssWidth, cssHeight, 'Sem dados para exibir');
        return;
    }

    const total = values.reduce((a, b) => a + b, 0);
    const colors = [
        '#7c3aed', // Roxo
        '#2563eb', // Azul
        '#f59e0b', // Laranja
        '#10b981', // Verde
        '#ef4444', // Vermelho
        '#8b5cf6', // Violeta
        '#ec4899', // Rosa
        '#06b6d4'  // Ciano
    ];

    let currentAngle = -Math.PI / 2;

    values.forEach((value, i) => {
        const sliceAngle = (value / total) * Math.PI * 2;
        const color = colors[i % colors.length];

        // Desenhar fatia
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.arc(centerX, centerY, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();

        // Desenhar label se a fatia for grande o suficiente
        if (sliceAngle > 0.35) {
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelX = centerX + Math.cos(labelAngle) * (radius + innerRadius) / 2;
            const labelY = centerY + Math.sin(labelAngle) * (radius + innerRadius) / 2;

            ctx.font = 'bold 12px var(--gs-font-sans)';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(labels[i], labelX, labelY);
        }

        currentAngle += sliceAngle;
    });

    // Texto central
    const primaryColor = getCSSVar('--gs-text-primary', '#1e293b');
    const secondaryColor = getCSSVar('--gs-text-secondary', '#64748b');

    ctx.font = 'bold 20px var(--gs-font-sans)';
    ctx.fillStyle = primaryColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${total} kg`, centerX, centerY - 10);

    ctx.font = '12px var(--gs-font-sans)';
    ctx.fillStyle = secondaryColor;
    ctx.fillText('Total desperdiçado', centerX, centerY + 15);

    // Legenda
    const legendY = cssHeight - 50;
    let legendX = 20;
    labels.forEach((label, i) => {
        if (legendX > cssWidth - 160) {
            legendX = 20;
        }

        const color = colors[i % colors.length];
        const percent = ((values[i] / total) * 100).toFixed(1);

        // Quadradinho de cor
        ctx.fillStyle = color;
        ctx.fillRect(legendX, legendY, 12, 12);

        // Texto
        ctx.font = '11px var(--gs-font-sans)';
        ctx.fillStyle = primaryColor;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${label} (${percent}%)`, legendX + 18, legendY + 6);

        legendX += ctx.measureText(`${label} (${percent}%)`).width + 30;
    });
}

/**
 * Desenha estado vazio no canvas
 */
function desenharEstadoVazio(ctx, width, height, mensagem) {
    const textColor = getCSSVar('--gs-text-muted', '#94a3b8');
    ctx.font = '14px var(--gs-font-sans)';
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(mensagem, width / 2, height / 2);
}

/**
 * Obtém valor de variável CSS com fallback
 */
function getCSSVar(varName, fallback) {
    try {
        const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
        return value || fallback;
    } catch (e) {
        return fallback;
    }
}

/**
 * Converte hex para rgba
 */
function hexToRgba(hex, alpha) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
        const r = parseInt(result[1], 16);
        const g = parseInt(result[2], 16);
        const b = parseInt(result[3], 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(124, 58, 237, ${alpha})`; // fallback purple
}

/**
 * Exporta funções para uso global
 */
window.desenharGraficoLinha = desenharGraficoLinha;
window.desenharGraficoRosca = desenharGraficoRosca;