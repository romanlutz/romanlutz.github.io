jQuery(document).ready(function($) {

	var my_nav = $('.navbar-sticky'); 
	
	// our function that decides wether the navigation bar should have "fixed" css position or not.
	var sticky_navigation = function(){
		my_nav.addClass( 'stick' ); 
	};

	var initio_parallax_animation = function() { 
		$('.parallax').each( function(i, obj) {
			var speed = $(this).attr('parallax-speed');
			if( speed ) {
				var background_pos = '-' + (window.pageYOffset / speed) + "px";
				$(this).css( 'background-position', 'center ' + background_pos );
			}
		});
	}
	
	// run our function on load
	sticky_navigation();
	
	// and run it again every time you scroll
	$(window).scroll(function() {
		 initio_parallax_animation();
	});

});