(() => {
  /* Aside Mobile toggle */
  Array.from(document.getElementsByClassName('jb-aside-mobile-toggle')).forEach(el => {
    el.addEventListener('click', e => {
      const dropdownIcon = e.currentTarget
        .getElementsByClassName('icon')[0]
        .getElementsByClassName('mdi')[0];

      Cookies.set(
        'asidemenu',
        document.documentElement.classList.toggle('has-aside-mobile-expanded'),
        { sameSite: 'strict' }
      );

      // dropdownIcon.classList.toggle('mdi-forwardburger');
      // dropdownIcon.classList.toggle('mdi-backburger');
    });
  });

  /* NavBar menu mobile toggle */
  Array.from(document.getElementsByClassName('jb-navbar-menu-toggle')).forEach(el => {
    el.addEventListener('click', e => {
      const dropdownIcon = e.currentTarget
        .getElementsByClassName('icon')[0]
        .getElementsByClassName('mdi')[0];

      document
        .getElementById(e.currentTarget.getAttribute('data-target'))
        .classList.toggle('is-active');
      dropdownIcon.classList.toggle('mdi-dots-vertical');
      dropdownIcon.classList.toggle('mdi-close');
    });
  });

  /* Modal: open */
  Array.from(document.getElementsByClassName('jb-modal')).forEach(el => {
    el.addEventListener('click', e => {
      const modalTarget = e.currentTarget.getAttribute('data-target');

      document.getElementById(modalTarget).classList.add('is-active');
      document.documentElement.classList.add('is-clipped');
    });
  });

  /* Modal: close */
  Array.from(document.getElementsByClassName('jb-modal-close')).forEach(el => {
    el.addEventListener('click', e => {
      e.currentTarget.closest('.modal').classList.remove('is-active');
      document.documentElement.classList.remove('is-clipped');
    });
  });

  /* Notification dismiss */
  Array.from(document.getElementsByClassName('jb-notification-dismiss')).forEach(el => {
    el.addEventListener('click', e => {
      e.currentTarget.closest('.notification').classList.add('is-hidden');
    });
  });

  var audioElement;
  $(document).ready(() => {
    audioElement = document.createElement('audio');
    audioElement.setAttribute('src', '/static/seeya.mp3');
    audioElement.volume = 0.3;
  });

  $('#shutdown').on('click', () => {
    $('html').addClass('gobyebye');
    $('body').append('<div class="is-overlay turnoff"></div>');
    audioElement.play();
    window.scrollTo(0, 0);
    axios.get('/fun/shutdown');
  });

  $('#open-plugins').on('click', () => {
    axios.get('/fun/open-plugins');
  });

  $('[jdenticon]').each(function (i, obj) {
    var str = $(this).attr('jdenticon');
    var size = $(this).attr('jdenticon-size');
    if (str == '') str = Math.random().toString();
    $(this).html(jdenticon.toSvg(str, parseInt(size)));
  });

  $('[geopattern]').each(function (i, obj) {
    var str = $(this).attr('geopattern');
    if (str == '') str = undefined;
    $(this).css({ background: GeoPattern.generate(str).toDataUrl() });
  });

  $('.data-upload').on('change', e => {
    const data = new FormData();
    data.append('upload', e.currentTarget.files[0], e.currentTarget.files[0].name);
    axios({
      method: 'post',
      url: `/upload/${encodeURIComponent(e.currentTarget.getAttribute('name'))}`,
      data: data,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${data._boundary}`,
      },
    })
      .then(response => {
        window.location.reload(true);
      })
      .catch(error => {
        window.location.reload(true);
      });
  });

  $('.data-delete').on('click', e => {
    axios
      .delete(`/upload/${encodeURIComponent(e.currentTarget.getAttribute('deleting'))}`)
      .then(response => {
        window.location.reload(true);
      })
      .catch(error => {
        window.location.reload(true);
      });
  });
})();
