import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import {
  CreateCinemaDto,
  CreateConcessionComboDto,
  CreateCinemaChainDto,
  CreateGenreDto,
  CreateMovieFromTmdbDto,
  CreateMovieDto,
  ImportUpcomingMoviesFromTmdbDto,
  RoomAvailableSlotsQueryDto,
  CreateRoomDto,
  CreateSeatDto,
  CreateShowtimeDto,
  GenerateSeatsDto,
  UpdateCinemaDto,
  UpdateConcessionComboDto,
  UpdateCinemaChainDto,
  UpdateGenreDto,
  UpdateMovieDto,
  UpdateRoomDto,
  UpdateSeatDto,
  UpdateShowtimeDto,
  UpsertCinemaTicketPriceDto,
} from './dto/admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard') getDashboard() { return this.adminService.getDashboard(); }

  @Get('genres') listGenres() { return this.adminService.listGenres(); }
  @Post('genres') createGenre(@Body() dto: CreateGenreDto) { return this.adminService.createGenre(dto); }
  @Patch('genres/:id') updateGenre(@Param('id') id: string, @Body() dto: UpdateGenreDto) { return this.adminService.updateGenre(id, dto); }
  @Delete('genres/:id') deleteGenre(@Param('id') id: string) { return this.adminService.deleteGenre(id); }

  @Get('movies') listMovies() { return this.adminService.listMovies(); }
  @Post('movies/tmdb') createMovieFromTmdb(@Body() dto: CreateMovieFromTmdbDto) { return this.adminService.createMovieFromTmdb(dto); }
  @Post('movies/tmdb/upcoming') importUpcomingMoviesFromTmdb(@Body() dto: ImportUpcomingMoviesFromTmdbDto) { return this.adminService.importUpcomingMoviesFromTmdb(dto); }
  @Post('movies') createMovie(@Body() dto: CreateMovieDto) { return this.adminService.createMovie(dto); }
  @Patch('movies/:id') updateMovie(@Param('id') id: string, @Body() dto: UpdateMovieDto) { return this.adminService.updateMovie(id, dto); }
  @Delete('movies/:id') deleteMovie(@Param('id') id: string) { return this.adminService.deleteMovie(id); }

  @Get('cinema-chains') listCinemaChains() { return this.adminService.listCinemaChains(); }
  @Post('cinema-chains') createCinemaChain(@Body() dto: CreateCinemaChainDto) { return this.adminService.createCinemaChain(dto); }
  @Patch('cinema-chains/:id') updateCinemaChain(@Param('id') id: string, @Body() dto: UpdateCinemaChainDto) { return this.adminService.updateCinemaChain(id, dto); }
  @Delete('cinema-chains/:id') deleteCinemaChain(@Param('id') id: string) { return this.adminService.deleteCinemaChain(id); }

  @Get('cinemas') listCinemas() { return this.adminService.listCinemas(); }
  @Post('cinemas') createCinema(@Body() dto: CreateCinemaDto) { return this.adminService.createCinema(dto); }
  @Patch('cinemas/:id') updateCinema(@Param('id') id: string, @Body() dto: UpdateCinemaDto) { return this.adminService.updateCinema(id, dto); }
  @Delete('cinemas/:id') deleteCinema(@Param('id') id: string) { return this.adminService.deleteCinema(id); }
  @Get('cinemas/:id/ticket-prices') listCinemaTicketPrices(@Param('id') id: string) { return this.adminService.listCinemaTicketPrices(id); }
  @Post('cinemas/:id/ticket-prices') upsertCinemaTicketPrice(@Param('id') id: string, @Body() dto: UpsertCinemaTicketPriceDto) { return this.adminService.upsertCinemaTicketPrice(id, dto); }
  @Patch('cinemas/:id/ticket-prices/:seatType') updateCinemaTicketPrice(@Param('id') id: string, @Param('seatType') seatType: string, @Body() dto: UpsertCinemaTicketPriceDto) { return this.adminService.upsertCinemaTicketPrice(id, { ...dto, seatType: seatType as any }); }
  @Delete('cinemas/:id/ticket-prices/:seatType') deactivateCinemaTicketPrice(@Param('id') id: string, @Param('seatType') seatType: string) { return this.adminService.deactivateCinemaTicketPrice(id, seatType); }

  @Get('concession-combos') listConcessionCombos() { return this.adminService.listConcessionCombos(); }
  @Post('concession-combos') createConcessionCombo(@Body() dto: CreateConcessionComboDto) { return this.adminService.createConcessionCombo(dto); }
  @Patch('concession-combos/:id') updateConcessionCombo(@Param('id') id: string, @Body() dto: UpdateConcessionComboDto) { return this.adminService.updateConcessionCombo(id, dto); }
  @Delete('concession-combos/:id') deleteConcessionCombo(@Param('id') id: string) { return this.adminService.deleteConcessionCombo(id); }

  @Get('rooms') listRooms() { return this.adminService.listRooms(); }
  @Post('rooms') createRoom(@Body() dto: CreateRoomDto) { return this.adminService.createRoom(dto); }
  @Get('rooms/:id/available-slots') getRoomAvailableSlots(@Param('id') id: string, @Query() query: RoomAvailableSlotsQueryDto) { return this.adminService.getRoomAvailableSlots(id, query); }
  @Patch('rooms/:id') updateRoom(@Param('id') id: string, @Body() dto: UpdateRoomDto) { return this.adminService.updateRoom(id, dto); }
  @Delete('rooms/:id') deleteRoom(@Param('id') id: string) { return this.adminService.deleteRoom(id); }
  @Post('rooms/:id/seats/generate') generateSeats(@Param('id') id: string, @Body() dto: GenerateSeatsDto) { return this.adminService.generateSeats(id, dto); }

  @Get('seats') listSeats() { return this.adminService.listSeats(); }
  @Post('seats') createSeat(@Body() dto: CreateSeatDto) { return this.adminService.createSeat(dto); }
  @Patch('seats/:id') updateSeat(@Param('id') id: string, @Body() dto: UpdateSeatDto) { return this.adminService.updateSeat(id, dto); }
  @Delete('seats/:id') deleteSeat(@Param('id') id: string) { return this.adminService.deleteSeat(id); }

  @Get('showtimes') listShowtimes() { return this.adminService.listShowtimes(); }
  @Post('showtimes') createShowtime(@Body() dto: CreateShowtimeDto) { return this.adminService.createShowtime(dto); }
  @Patch('showtimes/:id') updateShowtime(@Param('id') id: string, @Body() dto: UpdateShowtimeDto) { return this.adminService.updateShowtime(id, dto); }
  @Delete('showtimes/:id') deleteShowtime(@Param('id') id: string) { return this.adminService.deleteShowtime(id); }
}
