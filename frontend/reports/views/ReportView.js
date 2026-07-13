/**
 * Mục đích: Lớp View dựng giao diện và cập nhật DOM cho miền báo cáo.
 */
/* CineTicket - View báo cáo */
// Đối tượng ReportView đóng vai trò lớp hiển thị, dựng HTML và cập nhật DOM.
const ReportView = {
  // Dựng phần giao diện tương ứng trong khối renderReport.
  async renderReport() {
    await this.renderDashboard({ reportMode: true });
  },

  // Dựng phần giao diện tương ứng trong khối renderRevenue.
  async renderRevenue(days = this._revenueDays || 30) {
    if (!AuthController.requireAdmin()) return;
    this._revenueDays = Number(days);
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `<div class="admin-layout-wrap">${UserView._renderAdminSidebar('revenue')}<div class="admin-main"><div class="admin-content"><div class="admin-table-card"><div class="admin-table-empty"><i class="fas fa-spinner fa-spin"></i> Đang phân tích doanh thu từ PostgreSQL...</div></div></div></div></div>`;
    let data;
    try {
      data = await ReportController.getRevenue(this._revenueDays);
    } catch (error) {
      main.querySelector('.admin-content').innerHTML = `<div class="admin-table-card"><div class="admin-table-empty">Không tải được doanh thu: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</div></div>`;
      return;
    }
    main.innerHTML = `<div class="admin-layout-wrap">${UserView._renderAdminSidebar('revenue')}<div class="admin-main"><div class="admin-content">${this._revenueAnalyticsContent(data)}</div></div></div></div>`;
  },

  // Dựng phần giao diện tương ứng trong khối renderDashboard.
  async renderDashboard(options = {}) {
    // Kiểm tra trạng thái đăng nhập hoặc vai trò trước khi cho phép thao tác.
    if (!AuthController.requireAdmin()) return;
    document.body.classList.add('admin-layout');
    const main = document.getElementById('main-content');
    // Dừng hoặc đổi hướng luồng khi dữ liệu bắt buộc chưa sẵn sàng.
    if (!main) return;

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar(options.revenueOnly ? 'revenue' : options.reportMode ? 'reports' : 'dashboard')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar(options.revenueOnly ? 'Quản Lý Doanh Thu' : options.reportMode ? 'Báo Cáo' : 'Dashboard', 'admin')}
          <div class="admin-content">
            <div class="admin-table-card">
              <div class="admin-table-empty">Dang tai dashboard tu PostgreSQL...</div>
            </div>
          </div>
        </div>
      </div>`;

    let summary;
    // Bắt đầu thao tác có thể thất bại để hiển thị phản hồi phù hợp cho người dùng.
    try {
      summary = await ReportController.getSummary();
    } catch (error) {
      main.querySelector('.admin-content').innerHTML = `
        <div class="admin-table-card">
          <div class="admin-table-empty">Khong tai duoc dashboard: ${Helpers.escapeHtml(error.message || 'Backend unavailable')}</div>
        </div>`;
      return;
    }

    const cards = [
      { label: 'Phim', value: summary.movies, icon: 'film', tone: 'red', note: 'Trong hệ thống', color: 'var(--color-primary)' },
      { label: 'Rạp Chiếu', value: summary.cinemas, icon: 'building', tone: 'blue', note: 'Khu vực Đà Nẵng', color: 'var(--color-info)' },
      { label: 'Suất Chiếu', value: summary.showtimes, icon: 'calendar-alt', tone: 'yellow', note: 'Lịch chiếu đã tạo', color: 'var(--color-warning)' },
      { label: 'Người Dùng', value: summary.users, icon: 'users', tone: 'green', note: 'Tài khoản hệ thống', color: 'var(--color-success)' },
      { label: 'Vé Đã Thanh Toán', value: summary.bookings, icon: 'ticket-alt', tone: 'amber', note: 'Giao dịch thành công', color: 'var(--color-accent)' },
      { label: 'Doanh Thu', value: Helpers.formatCurrency(summary.revenue), icon: 'chart-line', tone: 'rose', note: 'Thanh toán thành công', color: 'var(--color-danger)' }
    ];
    const visibleCards = options.revenueOnly
      ? cards.filter((card) => ['Vé Đã Thanh Toán', 'Doanh Thu'].includes(card.label))
      : cards;

    const averageBookingValue = summary.bookings > 0
      ? summary.revenue / summary.bookings
      : 0;
    this._dashboardScheduleCache = new Map([
      [summary.date, { count: summary.todayShowtimes || 0, showtimes: summary.todaySchedules || [] }],
    ]);
    this._dashboardSelectedDate = summary.date;

    const currentUser = State.get('currentUser') || { name: 'Admin' };
    const currentHour = new Date().getHours();
    const greeting = currentHour < 11 ? 'Chào buổi sáng' : currentHour < 18 ? 'Chào buổi chiều' : 'Chào buổi tối';
    const dashboardCards = [
      { label: 'Doanh thu hôm nay', value: Helpers.formatCurrency(summary.todayRevenue || 0), icon: 'chart-line', tone: 'red', note: `${summary.todayPaidInvoices || 0} hóa đơn thành công`, route: '/admin/revenue' },
      { label: 'Suất chiếu hôm nay', value: summary.todayShowtimes || 0, icon: 'calendar-day', tone: 'blue', note: `${summary.activeShowtimes || 0} suất đang diễn ra` },
      { label: 'Phim đang chiếu', value: summary.nowShowingMovies || 0, icon: 'film', tone: 'yellow', note: `${summary.movies || 0} phim trong hệ thống` },
      { label: 'Người dùng', value: summary.users || 0, icon: 'users', tone: 'green', note: `${summary.bookings || 0} hóa đơn đã thanh toán`, route: '/admin/users' },
    ];

    const dashboardContent = `
      <div class="admin-dashboard-overview admin-dashboard-modern">
        <header class="admin-dashboard-welcome">
          <div>
            <span>Xin chào, ${Helpers.escapeHtml(currentUser.name || 'Admin')}</span>
            <h1>${greeting}</h1>
          </div>
          <div class="admin-dashboard-today"><i class="fas fa-calendar-day"></i>${new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
        </header>

        <section class="admin-dashboard-kpi-grid admin-dashboard-kpi-grid--modern" aria-label="Chỉ số hôm nay">
          ${dashboardCards.map(card => `
            <article class="admin-dashboard-kpi admin-dashboard-kpi--${card.tone} ${card.route ? 'is-clickable' : ''}" ${card.route ? `role="button" tabindex="0" onclick="Router.navigate('${card.route}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();Router.navigate('${card.route}');}"` : ''}>
              <div class="admin-dashboard-kpi-top">
                <span class="admin-dashboard-kpi-label">${card.label}</span>
                <span class="admin-dashboard-kpi-icon"><i class="fas fa-${card.icon}"></i></span>
              </div>
              <strong class="admin-dashboard-kpi-value">${card.value}</strong>
              <span class="admin-dashboard-kpi-note">${card.note}</span>
            </article>`).join('')}
        </section>

        <section class="admin-dashboard-workspace">
          <article class="admin-dashboard-panel admin-dashboard-calendar-panel">
            <div class="admin-dashboard-panel-heading">
              <div><span class="admin-dashboard-eyebrow">Lịch vận hành</span><h2>${this._dashboardMonthTitle()}</h2></div>
              <span class="admin-dashboard-panel-icon admin-dashboard-panel-icon--blue"><i class="fas fa-calendar"></i></span>
            </div>
            ${this._dashboardCalendar(summary.showtimeDates || [], summary.date)}
            <div class="admin-dashboard-calendar-note"><i></i> Ngày có lịch chiếu</div>
          </article>

          <article class="admin-dashboard-panel admin-dashboard-trend-panel">
            <div class="admin-dashboard-panel-heading">
              <div><span class="admin-dashboard-eyebrow">Thanh toán thành công</span><h2>7 ngày trước · 7 ngày sau</h2></div>
              <strong>${Helpers.formatCurrency(summary.todayRevenue || 0)}<small> hôm nay</small></strong>
            </div>
            ${this._dashboardRevenueChart(summary.revenueByDate || [])}
          </article>

          <article class="admin-dashboard-panel admin-dashboard-operation-panel">
            <div class="admin-dashboard-panel-heading">
              <div><span class="admin-dashboard-eyebrow">Hệ thống Đà Nẵng</span><h2>Trạng thái vận hành</h2></div>
              <span class="admin-dashboard-panel-icon"><i class="fas fa-signal"></i></span>
            </div>
            <div class="admin-dashboard-operation-total">
              <span>Tổng doanh thu</span><strong>${Helpers.formatCurrency(summary.revenue || 0)}</strong>
            </div>
            <div class="admin-dashboard-operation-list">
              <div><span><i class="fas fa-building"></i> Rạp chiếu</span><b>${summary.cinemas || 0}</b></div>
              <div><span><i class="fas fa-door-open"></i> Phòng chiếu</span><b>${summary.rooms || 0}</b></div>
              <div><span><i class="fas fa-couch"></i> Tổng ghế</span><b>${Number(summary.seats || 0).toLocaleString('vi-VN')}</b></div>
              <div><span><i class="fas fa-receipt"></i> Trung bình hóa đơn</span><b>${Helpers.formatCurrency(averageBookingValue)}</b></div>
            </div>
          </article>

          <article class="admin-dashboard-panel admin-dashboard-schedule-panel">
            <div class="admin-dashboard-panel-heading">
              <div><span class="admin-dashboard-eyebrow">Theo ngày đã chọn</span><h2 id="dashboard-schedule-title">Lịch chiếu hôm nay</h2></div>
              <span id="dashboard-schedule-count">${summary.todayShowtimes || 0} suất</span>
            </div>
            <div id="dashboard-schedule-content">${this._dashboardSchedules(summary.todaySchedules || [])}</div>
          </article>
        </section>
      </div>`;

    const reportContent = `
      <div class="admin-page-header">
        <div>
          <h1 class="admin-page-title">${options.revenueOnly ? 'Doanh Thu' : 'Báo Cáo Hệ Thống'}</h1>
          <p class="admin-page-subtitle">Dữ liệu thanh toán thành công từ PostgreSQL</p>
        </div>
      </div>
      <div class="dashboard-grid">
        ${visibleCards.map(card => `
          <div class="dashboard-card">
            <div class="dashboard-card-body">
              <div style="display:flex;justify-content:space-between;align-items:center;gap:16px;">
                <div>
                  <div style="color:var(--color-text-muted);font-size:.875rem;margin-bottom:8px;">${card.label}</div>
                  <div style="font-size:1.75rem;font-weight:800;">${card.value}</div>
                </div>
                <div style="width:48px;height:48px;border-radius:12px;background:${card.color};display:flex;align-items:center;justify-content:center;color:#fff;">
                  <i class="fas fa-${card.icon}"></i>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>`;

    main.innerHTML = `
      <div class="admin-layout-wrap">
        ${UserView._renderAdminSidebar(options.revenueOnly ? 'revenue' : options.reportMode ? 'reports' : 'dashboard')}
        <div class="admin-main">
          ${UserView._renderAdminTopbar(options.revenueOnly ? 'Quản Lý Doanh Thu' : options.reportMode ? 'Báo Cáo' : 'Dashboard', 'admin')}
          <div class="admin-content">
            ${options.revenueOnly || options.reportMode ? reportContent : dashboardContent}
          </div>
        </div>
      </div>`;
  },

  _revenueAnalyticsContent(data) {
    const summary = data.summary || {};
    const growth = Number(summary.growthPercent || 0);
    const growthClass = growth >= 0 ? 'positive' : 'negative';
    const periodLabel = `${new Date(`${data.period.from}T00:00:00+07:00`).toLocaleDateString('vi-VN')} – ${new Date(`${data.period.to}T00:00:00+07:00`).toLocaleDateString('vi-VN')}`;
    const cards = [
      { label: 'Tổng doanh thu', value: Helpers.formatCurrency(summary.revenue || 0), note: `${growth >= 0 ? '+' : ''}${growth.toFixed(1)}% so với kỳ trước`, icon: 'wallet', tone: 'green' },
      { label: 'Hóa đơn thành công', value: Number(summary.invoices || 0).toLocaleString('vi-VN'), note: 'Payment thành công', icon: 'receipt', tone: 'blue' },
      { label: 'Vé đã bán', value: Number(summary.tickets || 0).toLocaleString('vi-VN'), note: 'Vé trong các hóa đơn', icon: 'ticket-alt', tone: 'amber' },
      { label: 'Trung bình hóa đơn', value: Helpers.formatCurrency(summary.averageInvoice || 0), note: 'Giá trị mỗi giao dịch', icon: 'chart-line', tone: 'rose' },
    ];
    return `
      <div class="revenue-insights">
        <header class="revenue-insights-header">
          <div><span class="admin-dashboard-eyebrow">Dữ liệu tài chính CRTicket</span><h1>Phân Tích Doanh Thu</h1><p>Thanh toán thành công · ${periodLabel}</p></div>
          <label class="revenue-period-select"><span>Khoảng thời gian</span><select class="form-control" onchange="ReportView.renderRevenue(this.value)">${[[7,'7 ngày'],[30,'30 ngày'],[90,'90 ngày'],[365,'1 năm']].map(([value,label]) => `<option value="${value}" ${Number(data.period.days) === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label>
        </header>

        <section class="revenue-insights-kpis">
          ${cards.map((card, index) => `<article class="revenue-insight-kpi tone-${card.tone}"><div><span>${card.label}</span><i class="fas fa-${card.icon}"></i></div><strong>${card.value}</strong><small class="${index === 0 ? growthClass : ''}">${card.note}</small></article>`).join('')}
        </section>

        <section class="revenue-insights-grid">
          <article class="revenue-insight-panel revenue-trend-panel">
            <div class="revenue-panel-heading"><div><span class="admin-dashboard-eyebrow">Dòng tiền</span><h2>Doanh thu theo ngày</h2></div><strong>${Helpers.formatCurrency(summary.revenue || 0)}<small> tổng kỳ</small></strong></div>
            ${this._revenueAnalyticsChart(data.daily || [])}
          </article>
          <article class="revenue-insight-panel revenue-cinema-panel">
            <div class="revenue-panel-heading"><div><span class="admin-dashboard-eyebrow">Phân bổ</span><h2>Doanh thu theo rạp</h2></div></div>
            ${this._revenueCinemaBreakdown(data.topCinemas || [], summary.revenue || 0)}
          </article>
          <article class="revenue-insight-panel revenue-movie-panel">
            <div class="revenue-panel-heading"><div><span class="admin-dashboard-eyebrow">Hiệu suất phim</span><h2>Phim doanh thu cao</h2></div></div>
            ${this._revenueTopMovies(data.topMovies || [], summary.revenue || 0)}
          </article>
          <article class="revenue-insight-panel revenue-transaction-panel">
            <div class="revenue-panel-heading"><div><span class="admin-dashboard-eyebrow">PostgreSQL</span><h2>Giao dịch gần nhất</h2></div><span>${(data.recentTransactions || []).length} giao dịch</span></div>
            ${this._revenueTransactions(data.recentTransactions || [])}
          </article>
        </section>
      </div>`;
  },

  _revenueAnalyticsChart(items) {
    if (!items.length) return '<div class="admin-dashboard-empty">Chưa có dữ liệu doanh thu trong kỳ</div>';
    const max = Math.max(...items.map(item => Number(item.revenue || 0)), 1);
    const width = Math.max(760, items.length * (items.length > 100 ? 14 : items.length > 31 ? 22 : 36));
    return `<div class="revenue-analytics-scroll"><div class="revenue-analytics-bars" style="width:${width}px">${items.map(item => {
      const revenue = Number(item.revenue || 0);
      const height = revenue ? Math.max(8, Math.round((revenue / max) * 100)) : 2;
      const date = new Date(`${item.date}T00:00:00+07:00`);
      const showLabel = items.length <= 31 || date.getDate() === 1 || date.getDate() % 5 === 0;
      return `<div class="revenue-analytics-day" data-date-label="${date.toLocaleDateString('vi-VN')}" data-revenue="${revenue}" data-invoices="${item.invoices || 0}" onmouseenter="ReportView.showRevenueTooltip(event,this)" onmousemove="ReportView.moveRevenueTooltip(event)" onmouseleave="ReportView.hideRevenueTooltip()"><span style="height:${height}%"></span><small>${showLabel ? `${String(date.getDate()).padStart(2,'0')}/${String(date.getMonth()+1).padStart(2,'0')}` : ''}</small></div>`;
    }).join('')}</div></div>`;
  },

  _revenueCinemaBreakdown(cinemas, totalRevenue) {
    if (!cinemas.length) return '<div class="admin-dashboard-empty">Chưa có doanh thu theo rạp</div>';
    const colors = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4'];
    let cursor = 0;
    const gradients = cinemas.map((cinema, index) => {
      const percent = totalRevenue ? (Number(cinema.revenue || 0) / totalRevenue) * 100 : 0;
      const start = cursor;
      cursor += percent;
      return `${colors[index]} ${start}% ${cursor}%`;
    });
    if (cursor < 100) gradients.push(`var(--color-border) ${cursor}% 100%`);
    return `<div class="revenue-cinema-breakdown"><div class="revenue-donut" style="background:conic-gradient(${gradients.join(',')})"><div><strong>${cinemas.length}</strong><span>rạp có doanh thu</span></div></div><div class="revenue-cinema-list">${cinemas.map((cinema,index) => { const percent = totalRevenue ? (Number(cinema.revenue || 0) / totalRevenue) * 100 : 0; return `<div><i style="background:${colors[index]}"></i><span>${Helpers.escapeHtml(cinema.name)}</span><strong>${Helpers.formatCurrency(cinema.revenue)}</strong><small>${percent.toFixed(1)}%</small></div>`; }).join('')}</div></div>`;
  },

  _revenueTopMovies(movies, totalRevenue) {
    if (!movies.length) return '<div class="admin-dashboard-empty">Chưa có doanh thu theo phim</div>';
    const max = Math.max(...movies.map(movie => Number(movie.revenue || 0)), 1);
    return `<div class="revenue-top-movies">${movies.map((movie,index) => `<div class="revenue-top-movie"><span class="rank">${index + 1}</span><img src="${movie.posterUrl || API.moviePosterFallback}" onerror="this.src=API.moviePosterFallback" alt=""><div><strong>${Helpers.escapeHtml(movie.name)}</strong><small>${movie.tickets || 0} vé · ${movie.invoices || 0} hóa đơn</small><span><i style="width:${Math.round((Number(movie.revenue || 0) / max) * 100)}%"></i></span></div><b>${Helpers.formatCurrency(movie.revenue)}</b></div>`).join('')}</div>`;
  },

  _revenueTransactions(transactions) {
    if (!transactions.length) return '<div class="admin-dashboard-empty">Chưa có giao dịch thành công trong kỳ</div>';
    return `<div class="table-wrapper"><table class="admin-table revenue-transaction-table"><thead><tr><th>Khách hàng</th><th>Phim / Rạp</th><th>Vé</th><th>Thời gian</th><th>Thanh toán</th><th>Số tiền</th><th></th></tr></thead><tbody>${transactions.map(item => `<tr><td><strong>${Helpers.escapeHtml(item.customer)}</strong><small>${Helpers.escapeHtml(String(item.bookingId).slice(-8))}</small></td><td><strong>${Helpers.escapeHtml(item.movie)}</strong><small>${Helpers.escapeHtml(item.cinema)}</small></td><td>${item.tickets}</td><td>${new Date(item.paidAt).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}</td><td>${Helpers.escapeHtml(item.provider || '—')}</td><td><strong class="revenue-amount">${Helpers.formatCurrency(item.amount)}</strong></td><td><button class="btn btn-outline btn-sm" onclick="BookingView.showDetail('${item.bookingId}')"><i class="fas fa-eye"></i></button></td></tr>`).join('')}</tbody></table></div>`;
  },

  _dashboardMonthTitle() {
    return new Date().toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
  },

  _dashboardCalendar(showtimeDates, selectedDate) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const leadingDays = (new Date(year, month, 1).getDay() + 6) % 7;
    const showtimeSet = new Set(showtimeDates);
    const cells = Array.from({ length: leadingDays }, () => '<span class="empty"></span>');
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const classes = [
        day === now.getDate() ? 'today' : '',
        showtimeSet.has(date) ? 'has-showtime' : '',
        date === selectedDate ? 'selected' : '',
      ].filter(Boolean).join(' ');
      cells.push(`<button type="button" class="${classes}" data-date="${date}" title="${showtimeSet.has(date) ? 'Có lịch chiếu' : 'Chưa có lịch chiếu'}" onclick="ReportView.selectDashboardDate('${date}')">${day}</button>`);
    }
    return `
      <div class="admin-dashboard-calendar-week"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
      <div class="admin-dashboard-calendar-days">${cells.join('')}</div>`;
  },

  async selectDashboardDate(date) {
    this._dashboardSelectedDate = date;
    document.querySelectorAll('.admin-dashboard-calendar-days [data-date]').forEach(item => {
      item.classList.toggle('selected', item.dataset.date === date);
    });
    const title = document.getElementById('dashboard-schedule-title');
    const count = document.getElementById('dashboard-schedule-count');
    const content = document.getElementById('dashboard-schedule-content');
    if (!title || !count || !content) return;
    const selected = new Date(`${date}T00:00:00+07:00`);
    title.textContent = `Lịch chiếu ngày ${selected.toLocaleDateString('vi-VN')}`;

    const cached = this._dashboardScheduleCache?.get(date);
    if (cached) {
      count.textContent = `${cached.count} suất`;
      content.innerHTML = this._dashboardSchedules(cached.showtimes);
      return;
    }

    count.textContent = 'Đang tải...';
    content.innerHTML = '<div class="admin-dashboard-empty"><i class="fas fa-spinner fa-spin"></i>&nbsp; Đang tải lịch chiếu...</div>';
    try {
      const result = await API.getAdminDashboardShowtimes(date);
      this._dashboardScheduleCache?.set(date, result);
      if (!document.getElementById('dashboard-schedule-content') || this._dashboardSelectedDate !== date) return;
      count.textContent = `${result.count || 0} suất`;
      content.innerHTML = this._dashboardSchedules(result.showtimes || []);
    } catch (error) {
      count.textContent = 'Không tải được';
      content.innerHTML = `<div class="admin-dashboard-empty">${Helpers.escapeHtml(error.message || 'Không thể tải lịch chiếu')}</div>`;
    }
  },

  _dashboardRevenueChart(items) {
    if (!items.length) return '<div class="admin-dashboard-empty">Chưa có dữ liệu doanh thu</div>';
    const maxRevenue = Math.max(...items.map(item => Number(item.revenue || 0)), 1);
    return `
      <div class="admin-dashboard-revenue-chart">
        ${items.map(item => {
          const revenue = Number(item.revenue || 0);
          const height = revenue > 0 ? Math.max(8, Math.round((revenue / maxRevenue) * 100)) : 3;
          const date = new Date(`${item.date}T00:00:00+07:00`);
          return `<div class="admin-dashboard-revenue-day" data-date-label="${date.toLocaleDateString('vi-VN')}" data-revenue="${revenue}" data-invoices="${item.invoices || 0}" onmouseenter="ReportView.showRevenueTooltip(event, this)" onmousemove="ReportView.moveRevenueTooltip(event)" onmouseleave="ReportView.hideRevenueTooltip()">
            <span class="admin-dashboard-revenue-bar" style="height:${height}%"></span>
            <small>${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}</small>
          </div>`;
        }).join('')}
      </div>`;
  },

  showRevenueTooltip(event, element) {
    let tooltip = document.getElementById('admin-dashboard-revenue-tooltip');
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = 'admin-dashboard-revenue-tooltip';
      tooltip.className = 'admin-dashboard-revenue-tooltip';
      document.body.appendChild(tooltip);
    }
    tooltip.innerHTML = `
      <span>${Helpers.escapeHtml(element.dataset.dateLabel || '')}</span>
      <strong>${Helpers.formatCurrency(Number(element.dataset.revenue || 0))}</strong>
      <small>${Number(element.dataset.invoices || 0)} hóa đơn thành công</small>`;
    tooltip.classList.add('visible');
    this.moveRevenueTooltip(event);
  },

  moveRevenueTooltip(event) {
    const tooltip = document.getElementById('admin-dashboard-revenue-tooltip');
    if (!tooltip) return;
    const gap = 14;
    const width = tooltip.offsetWidth;
    const height = tooltip.offsetHeight;
    const left = Math.min(event.clientX + gap, window.innerWidth - width - 10);
    const top = Math.max(10, event.clientY - height - gap);
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  },

  hideRevenueTooltip() {
    document.getElementById('admin-dashboard-revenue-tooltip')?.classList.remove('visible');
  },

  _dashboardSchedules(schedules) {
    if (!schedules.length) return '<div class="admin-dashboard-empty">Ngày này chưa có lịch chiếu</div>';
    const now = new Date();
    return `<div class="admin-dashboard-schedule-list">${schedules.map(showtime => {
      const startAt = new Date(showtime.startAt);
      const endAt = new Date(showtime.endAt);
      const status = now < startAt ? 'upcoming' : now < endAt ? 'active' : 'ended';
      const statusText = status === 'active' ? 'Đang chiếu' : status === 'upcoming' ? 'Sắp chiếu' : 'Đã chiếu';
      return `<div class="admin-dashboard-schedule-item">
        <span class="admin-dashboard-schedule-time">${startAt.toLocaleTimeString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit' })}</span>
        <div class="admin-dashboard-schedule-movie">
          <strong>${Helpers.escapeHtml(showtime.movie?.title || '')}</strong>
          <span>${Helpers.escapeHtml(showtime.room?.cinema?.name || '')} · ${Helpers.escapeHtml(showtime.room?.name || '')}</span>
        </div>
        <div class="admin-dashboard-schedule-seats"><b>${showtime.bookedSeats || 0}</b>/${showtime.totalSeats || 0} ghế</div>
        <span class="admin-dashboard-schedule-status ${status}">${statusText}</span>
      </div>`;
    }).join('')}</div>`;
  }
};
