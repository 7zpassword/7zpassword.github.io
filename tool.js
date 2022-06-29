var uniqueId = 0;

// Check for the various File API support.
if (window.File && window.FileReader && window.FileList && window.Blob) {
	// Great success! All the File APIs are supported.
} else {
	$('#error').show();
}

// http://www.html5rocks.com/en/tutorials/file/dndfiles/
function handleFileSelect(e) {
	e.stopPropagation();
	e.preventDefault();

	// files is a FileList of File objects. List some properties.
	var files = e.target.files || e.dataTransfer.files;
	for (var i in files) {
		if (
			typeof files[i].type === 'string' &&
			files[i].type.indexOf('image/') > -1
		) {
			var reader = new FileReader();
			reader.onload = function (e) {
				uniqueId++; // 고유번호 증가
				$('#thumbnail').append(
					"<div class='thumbnail'><button onclick='rm(this);' type='button' class='close'>×</button><img id='i" +
						uniqueId +
						"' src='" +
						e.target.result +
						"'/></div>"
				);
				$(
					"<img id='i" +
						uniqueId +
						"_raw' src='" +
						e.target.result +
						"'/>"
				)
					.appendTo('#hiddenThumbnail')
					.bind('load', function () {
						$('#' + $(this).attr('id').replace('_raw', ''))
							.attr('w', $(this).width())
							.attr('h', $(this).height());
					});
			};
			// Read in the image file as a data URL.
			reader.readAsDataURL(files[i]);
		}
	}
	$('#reset').show();
}
function handleDragOver(e) {
	e.stopPropagation();
	e.preventDefault();
	if (typeof e.dataTransfer != 'undefined')
		e.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
}

function rm(o) {
	$('#' + $(o).next().attr('id') + '_raw').remove();
	$(o)
		.parent()
		.fadeOut('fast', function () {
			$(this).remove();
		});
}

function calculate(params) {
	var rows = params.rows;
	if (rows.length === 0) {
		return false;
	}

	var column = params.column;
	var maxwidth = params.maxwidth;
	var margin = params.margin;

	var total = rows.length;
	if (total < column) {
		column = total;
	}

	var canvas = {
		w: 0,
		h: 0,
	};

	var baseIndex = 0;
	var base = [
		{
			sw: rows[0]['sw'],
			sh: rows[0]['sh'],
		},
	];

	var zoom = (maxwidth - margin * (column + 1)) / (base[0]['sw'] * column);
	if (zoom > 1) {
		zoom = 1; // max가 더 크면 그냥 원본을 유지한다.
	} else if (zoom < 1) {
		base[0]['dw'] = rows[0]['sw'] * zoom;
	}

	var data = [];

	canvas['w'] = Math.ceil(
		base[0]['sw'] * column * zoom + margin * (column + 1)
	);

	if (zoom < 1 && canvas['w'] < maxwidth) {
		canvas['w'] = maxwidth;
	}
	for (var i = 0; i < total; i++) {
		var r = rows[i];
		var t = {
			id: r['id'],
			sx: 0,
			sy: 0,
			sw: r['sw'],
			sh: r['sh'],
			dx: 0,
			dy: 0,
			dw: 0,
			dh: 0,
		};
		if (i % column === 0) {
			// get max height
			if (i !== 0) {
				baseIndex++;
			}
			if (typeof base[baseIndex] === 'undefined') {
				base[baseIndex] = {
					sw: 0,
					sh: 0,
				};
			}
			// base[baseIndex]['sh'] = 0; // format
			for (var a = 0; a < column; a++) {
				var this_i = i + a;
				if (
					typeof rows[this_i] !== 'undefined' &&
					typeof rows[this_i]['sh'] !== 'undefined'
				) {
					var tmp;
					if (
						rows[this_i]['sw'] > rows[this_i]['sh'] && // landscape이면서
						rows[this_i]['sw'] < base[0]['sw'] && // 폭보다 좁은 놈이면서
						rows[this_i]['sh'] < base[0]['sh'] // 높이조차 기초보다 좁은 놈.. 높이가 상당히 있는 놈은 그냥 중앙정렬.
					) {
						tmp =
							rows[this_i]['sh'] *
							(base[0]['sw'] / rows[this_i]['sw']);
					} else {
						tmp = rows[this_i]['sh'];
					}
					if (tmp > base[baseIndex]['sh']) {
						base[baseIndex]['sh'] = tmp;
					}
				}
			}
		}
		// 이미지가 기준 이미지보다 큰지 검사하기.
		if (t['sw'] > base[0]['sw'] || t['sh'] > base[baseIndex]['sh']) {
			// 첫번째 이미지보다 크다면 이녀석을 비율에 맞게 줄여주어야 한다.
			if (t['sw'] - base[0]['sw'] > t['sh'] - base[baseIndex]['sh']) {
				// 둘다 나갔는데 폭이 더 차이가 많이 나면..
				t['dw'] = base[0]['sw']; // 폭는 기준 폭로 강제 지정
				t['dh'] = t['sh'] * (t['dw'] / t['sw']); // 높이가 폭 줄어든 비율로 줄어든다.
			} else {
				// portrait, 높이를 기준으로 줄여주기.
				t['dh'] = base[baseIndex]['sh']; // 높이는 기준 높이로 강제 지정
				t['dw'] = t['sw'] * (t['dh'] / t['sh']); // 높이가 높이 줄어든 비율로 줄어든다.
			}

			// 이미지가 둘다 작을 때 키워야 한다.
		} else if (t['sw'] < base[0]['sw'] && t['sh'] < base[baseIndex]['sh']) {
			// 좆만한 이미지라면 높이든 폭이든 키워야 한다.
			// echo 'i'.i.'------dw : '.t['dw'].', dh : '.t['dh'].', zoom : '.zoom;
			//echo '-----'.i." , sw/sh : ".t['sw']/t['sh'];
			if (
				base[0]['sw'] - t['sw'] >
				(base[baseIndex]['sh'] - t['sh']) * (t['sw'] / t['sh'])
			) {
				// 둘다 나갔는데 폭이 더 차이가 많이 나면..
				// 이번엔 위와 반대로 차이가 덜 나는 놈을 기준으로 키워준다. 높이가 덜 차이 나니까 높이를 기준으로 키워준다.
				t['dh'] = base[baseIndex]['sh'];
				t['dw'] = t['sw'] * (base[baseIndex]['sh'] / t['sh']);
			} else {
				// 폭을 넓혀준다.
				t['dw'] = base[0]['sw'];
				t['dh'] = t['sh'] * (base[0]['sw'] / t['sw']);
			}
		} else {
			t['dw'] = t['sw'];
			t['dh'] = t['sh'];
		}

		t['dw'] = Math.floor(t['dw'] * zoom);
		t['dh'] = Math.floor(t['dh'] * zoom);

		data.push(t);
	}

	baseIndex = 0;
	var prevHeight = margin;
	for (var i = 0; i < data.length; i++) {
		var t = data[i];
		if (i % column === 0) {
			// get max height
			if (i !== 0) {
				prevHeight += base[baseIndex]['dh'] + margin;
			}
			if (i !== 0) {
				baseIndex++;
			}
			base[baseIndex]['dh'] = 0; // format
			for (var a = 0; a < column; a++) {
				if (
					typeof data[i + a] !== 'undefined' &&
					typeof data[i + a]['dh'] !== 'undefined'
				) {
					if (data[i + a]['dh'] > base[baseIndex]['dh'])
						base[baseIndex]['dh'] = data[i + a]['dh'];
				}
			}
		}
		if (t['dw'] < data[0]['dw'])
			// 무슨 이유에선지 기준폭보다 작다면 dx조정해주기.
			t['dx'] = (data[0]['dw'] - t['dw']) / 2; // 폭이 줄어든 거의 반만큼 dx는 우측으로 이동한다.
		if (t['dh'] < base[baseIndex]['dh'])
			// 무슨 이유에선지 기준높이 보다 작다면 dy조정해주기.
			t['dy'] = (base[baseIndex]['dh'] - t['dh']) / 2; // 높이가 줄어든 거의 반만큼 dy는 아래로 이동한다.
		t['dx'] =
			(t['dx'] + (i % column) * base[0]['sw']) * zoom +
			(i % column) * margin +
			margin;
		t['dx'] = Math.floor(t['dx']);
		t['dy'] = t['dy'] + prevHeight;
		t['dy'] = Math.floor(t['dy']);
	}

	canvas['h'] = Math.ceil(prevHeight + base[baseIndex]['dh'] + margin);

	return {
		margin: margin,
		canvas: canvas,
		data: data,
	};
}

var canvas = document.getElementById('canvas');
var context = canvas.getContext('2d');

function drawAction(d) {
	var background = $('#optBackground > button.active').val();
	if (background == 'user') background = '#' + $('#user_color').val();
	var copyright = $('input[name=copyright]').val();
	if (copyright != '' && canvas.width >= 700) d.canvas.h += 16;
	// 캔버스 사이즈를 정한다.
	canvas.setAttribute('width', d.canvas.w);
	canvas.setAttribute('height', d.canvas.h);
	context.fillStyle =
		background == 'transparency' ? 'rgba(255,255,255,0)' : background;
	context.fillRect(0, 0, d.canvas.w, d.canvas.h);
	$('#size').html('Original size : ' + d.canvas.w + ' x ' + d.canvas.h);

	for (var i in d.data) {
		1;
		var t = d.data[i];
		// 캔버스에 갖다가 붙인다.
		context.drawImage(
			document.getElementById(t.id + '_raw'),
			t.sx,
			t.sy,
			t.sw,
			t.sh,
			t.dx,
			t.dy,
			t.dw,
			t.dh
		);
	}
	context.font = '8pt Calibri';
	context.textAlign = 'right';
	context.fillStyle = background == 'white' ? '#bbbbbb' : '#cccccc';
	if (copyright != '' && canvas.width >= 700)
		context.fillText(
			'made by ' + copyright,
			canvas.width - d.margin,
			canvas.height - 5
		);

	$('#result')
		.attr(
			'src',
			canvas.toDataURL(
				background == 'transparency' ? 'image/png' : 'image/jpeg'
			)
		)
		.show()
		.prev()
		.show()
		.prev()
		.hide();

	setTimeout(function () {
		$('#run').button('complete');
		$('#result').fadeTo('normal', 1, function () {
			$('#controlbar').fadeIn('slow');
		});
	}, 1000);
}

$(function () {
	$('#files').bind('change', handleFileSelect);
	$('#user_color').change(function () {
		$(this)
			.prev()
			.css('background', '#' + $(this).val());
	});
	$('#user_column').change(function () {
		$(this).closest('button').val($(this).val());
	});
	// Originally solved by Tim Branyen in his drop file plugin
	// http://dev.aboutnerd.com/jQuery.dropFile/jquery.dropFile.js
	$.event.props.push('dataTransfer');
	$('#dropZone')
		.bind('dragover', handleDragOver)
		.bind('drop', handleFileSelect);

	$('#thumbnail').sortable();

	$('#reset').bind('click', function () {
		if ($('#thumbnail > div').length > 0) {
			$('#thumbnail, #hiddenThumbnail').empty();
		}
		$(this).fadeOut();
	});
	$('#btn_user_color').click(function () {
		$(this).children('input').focus().select();
	});

	$('#controlbar a').bind('click', function () {
		var type = $(this).data('type');
		if (!type) return;
		var _f = $('#hidden_form');
		var background = $('#optBackground > button.active').val();
		if (background == 'user') background = '#' + $('#user_color').val();
		var ext = background == 'transparency' ? 'image/png' : 'image/jpeg';
		_f.find('textarea').val(canvas.toDataURL(ext));
		_f.find('[name=type]').val(type);
		_f.find('[name=ext]').val(ext);
		_f.submit();
	});

	$('#btnDownload').on('click', function () {
		try {
			canvas.toBlob(function (blob) {
				saveAs(blob, 'makephotogallery.net_' + +new Date() + '.png');
			});
		} catch (e) {
			console.log('e', e);
		}
	});

	$('#run')
		.bind('click', function () {
			$('#result').css('opacity', 0.3);
			var params = {};
			params.column = parseInt($('#optColumn > button.active').val());
			params.maxwidth = parseFloat(
				$('#optMaxWidth > button.active').val()
			);
			params.margin = parseInt($('#optMargin > button.active').val());
			params.rows = [];

			$('#thumbnail img').each(function () {
				var t = {};
				t.id = $(this).attr('id');
				t.sw = parseInt($(this).attr('w'));
				t.sh = parseInt($(this).attr('h'));
				if (t.sw == 0 || t.sh == 0) {
					alert(msgError);
					return false;
				}
				params.rows.push(t);
			});
			if (params.rows.length == 0) return false;
			$(this).button('loading');

			drawAction(calculate(params));
			return false;

			$.post(
				root + '/calculate',
				$.param(params),
				function (d) {
					drawAction(d);
				},
				'json'
			);
		})
		.tooltip();
});
