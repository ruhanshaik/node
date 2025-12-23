<style>
    .live-indicator {
        position: absolute;
        top: 15px;
        right: 20px;
        background: rgba(52, 199, 89, 0.1);
        color: #34C759;
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 11px;
        font-weight: 700;
        display: flex;
        align-items: center;
        gap: 5px;
        z-index: 10;
    }
    .dot {
        width: 6px;
        height: 6px;
        background: #34C759;
        border-radius: 50%;
        animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.4; }
        100% { opacity: 1; }
    }
</style>

<div class="live-indicator">
    <div class="dot"></div>
    <span id="user-count">0</span> ONLINE
</div>

<script>
    socket.on('user-count', (count) => {
        document.getElementById('user-count').innerText = count;
    });
</script>
