/* CineTicket - Movie Controller */
const MovieController = {
  getAll(filters) { return MovieModel.getAll(filters); },
  getById(id) { return MovieModel.getById(id); },
  search(query) { return MovieModel.search(query); },
  getByStatus(status) { return MovieModel.getByStatus(status); },

  handleCreate(event) {
    event.preventDefault();
    const form = event.target;
    const data = {
      title: form.querySelector('#movie-title').value.trim(),
      titleEn: form.querySelector('#movie-title-en').value.trim(),
      genre: form.querySelector('#movie-genre').value.split(',').map(g => g.trim()).filter(Boolean),
      duration: parseInt(form.querySelector('#movie-duration').value),
      language: form.querySelector('#movie-language').value,
      description: form.querySelector('#movie-desc').value.trim(),
      director: form.querySelector('#movie-director').value.trim(),
      releaseDate: form.querySelector('#movie-release').value,
      status: form.querySelector('#movie-status').value,
      poster: form.querySelector('#movie-poster').value.trim() || API.moviePosterFallback,
      banner: form.querySelector('#movie-banner').value.trim() || API.moviePosterFallback,
      cast: [],
      ageRating: 'C13',
      trailer: form.querySelector('#movie-trailer').value.trim()
    };
    if (!data.title) { Toast.error('Vui lòng nhập tên phim'); return; }
    const result = MovieModel.create(data);
    if (result.success) { Toast.success('Thêm phim thành công'); MovieView.renderAdmin(); }
    else Toast.error('Có lỗi xảy ra');
  },

  async handleCreateFromTmdb(event) {
    event.preventDefault();
    const form = event.target;
    const rawTmdbValue = form.querySelector('#tmdb-movie-id').value.trim();
    const tmdbMatch = rawTmdbValue.match(/(?:movie\/)?(\d+)/);
    const tmdbId = tmdbMatch ? parseInt(tmdbMatch[1], 10) : 0;
    const status = form.querySelector('#tmdb-movie-status').value;

    if (!tmdbId) {
      Toast.error('Vui lòng nhập TMDB ID hợp lệ');
      return;
    }

    try {
      await API.createAdminMovieFromTmdb(tmdbId, status);
      await API.syncBackendCatalog();
      Modal.close();
      Toast.success('Đã thêm/cập nhật phim từ TMDB');
      MovieView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Không thể lấy phim từ TMDB');
    }
  },

  async handleImportUpcomingFromTmdb() {
    try {
      Toast.info('Dang cap nhat phim sap chieu tu TMDB...');
      const result = await API.importUpcomingMoviesFromTmdb({ page: 1, limit: 10 });
      await API.syncBackendCatalog();
      Toast.success(`Da cap nhat ${result.importedCount || 0} phim sap chieu`);
      MovieView.renderAdmin();
    } catch (error) {
      Toast.error(error.message || 'Khong the cap nhat phim sap chieu');
    }
  },

  handleDelete(id) {
    Modal.confirm('Bạn có chắc muốn xóa vĩnh viễn phim này? Các suất chiếu, booking và vé liên quan cũng sẽ bị xóa.', 'Xác Nhận Xóa', 'danger').then(async confirmed => {
      if (confirmed) {
        try {
          await API.deleteAdminMovie(id);
          await API.syncBackendCatalog();
          MovieView.renderAdmin();
          Toast.success('Đã xóa phim khỏi database');
        } catch (error) {
          Toast.error(error.message || 'Không thể xóa phim');
        }
      }
    });
  }
};
