// Gruntfile with the configuration of grunt-express and grunt-open. No livereload yet!
module.exports = function(grunt) {

  var port = 3000;
 
  // Load Grunt tasks declared in the package.json file
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);
 
  // Configure Grunt 
  grunt.initConfig({
    express: {
      all: {
        options: {
          port: port,
          hostname: "localhost",
          bases: [__dirname],
          livereload: true
        }
      }
    },
    watch: {
      all: {
        files: ['**/*.{js,css,html}', '!Gruntfile.js'],
        options: {
          livereload: true
        }
      }
    },
 
    // grunt-open will open your browser at the project's URL
    open: {
      all: {
        path: 'http://localhost:<%= express.all.options.port%>'
      }
    }
  });

  grunt.registerTask('default', ['express', 'open', 'watch']);
};