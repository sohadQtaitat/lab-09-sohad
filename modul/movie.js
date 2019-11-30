MOVIES
'use strict';
const superagent = reqiure ('superagent');

module.exports = getMovies ;


function getMovies(location){

    const url =`https://api.themoviedb.org/3/movie/550?api_key=${process.env.MOVIE_API_KEY}/${location}`;

    return superagent.get(url)

    .then (data => parseMoviesData(data.body));
}




function parseMoviesData(data) {

    try {
        const movies = data.results.map(movie =>{
            return new Movies (movie) ;
        });
        return Promise.resolve (movies);
      }  catch(e){
          return Promise.reject(e) ;
    }
}




function Movie(movie){
    this.tableName='movies';
    this.title =movie.title ;
    this.overview=movie.overview ;
    this.average_votes=movie.vote_average;
    this.total_votes=movie.vote_count ;
    this.image_url='https://image.tmdb.org/t/p/w500'+movie.poster_path ;
    this.popularity = movie.popularity ;
    this.released_on = movie.release_data ;
    this.created_at = Date.now();
}