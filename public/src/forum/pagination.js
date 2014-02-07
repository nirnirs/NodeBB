

define(function() {
	var pagination = {};

	pagination.currentPage = 0;
	pagination.pageCount = 0;

	pagination.init = function(currentPage, pageCount) {
		pagination.currentPage = parseInt(currentPage, 10);
		pagination.pageCount = parseInt(pageCount, 10);

		pagination.recreatePaginationLinks(pageCount);

		$('.pagination')
			.on('click', '.previous', function() {
				return pagination.loadPage(pagination.currentPage - 1);
			}).on('click', '.next', function() {
				return pagination.loadPage(pagination.currentPage + 1);
			}).on('click', '.page', function() {
				return pagination.loadPage($(this).attr('data-page'));
			}).on('click', '.select_page', function(e) {
				e.preventDefault();
				bootbox.prompt('Enter page number:', function(pageNum) {
					pagination.loadPage(pageNum);
				});
			});
	}

	pagination.recreatePaginationLinks = function(newPageCount) {
		pagination.pageCount = parseInt(newPageCount, 10);

		var pagesToShow = [1];
		if(pagination.pageCount !== 1) {
			pagesToShow.push(pagination.pageCount);
		}

		var previous = pagination.currentPage - 1;
		var next = pagination.currentPage + 1;

		if(previous > 1 && pagesToShow.indexOf(previous) === -1) {
			pagesToShow.push(previous);
		}

		if(next < pagination.pageCount && pagesToShow.indexOf(next) === -1) {
			pagesToShow.push(next);
		}

		if(pagesToShow.indexOf(pagination.currentPage) === -1) {
			pagesToShow.push(pagination.currentPage);
		}

		pagesToShow.sort(function(a, b) {
			return parseInt(a, 10) - parseInt(b, 10);
		});

		var html = '';
		for(var i=0; i<pagesToShow.length; ++i) {
			if(i > 0) {
				if (pagesToShow[i] - 1 !== pagesToShow[i-1]) {
					html += '<li><a class="select_page" href="#">|</a></li>';
				}
			}
			html += '<li class="page" data-page="' + pagesToShow[i] + '"><a href="#">' + pagesToShow[i] + '</a></li>';
		}

		$('.pagination li.page').remove();
		$('.pagination li .select_page').parent().remove();
		$(html).insertAfter($('.pagination li.previous'));

		updatePageLinks();
	}

	pagination.loadPage = function(page, callback) {
		page = parseInt(page, 10);
		if(!utils.isNumber(page) || page < 1 || page > pagination.pageCount) {
			return false;
		}

		ajaxify.go(window.location.pathname.slice(1) + '?page=' + page);
		return true;
	}

	function updatePageLinks() {
		if(pagination.pageCount === 0 || pagination.pageCount === 1) {
			$('.pagination').addClass('hide');
		} else {
			$('.pagination').removeClass('hide');
		}

		$('.pagination .next').removeClass('disabled');
		$('.pagination .previous').removeClass('disabled');

		if(pagination.currentPage === 1) {
			$('.pagination .previous').addClass('disabled');
		}

		if(pagination.currentPage === pagination.pageCount) {
			$('.pagination .next').addClass('disabled');
		}

		$('.pagination .page').removeClass('active');
		$('.pagination .page[data-page="' + pagination.currentPage + '"]').addClass('active');
		$('.pagination .page').each(function(index, element) {
			var li = $(this);
			var page = li.attr('data-page');
			li.find('a').attr('href', window.location.pathname + '?page=' + page);
		});
	}

	return pagination;
});