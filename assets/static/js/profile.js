(() => {
  $('#name-input').on('input', e => {
    let target = e.currentTarget.value;
    if (e.currentTarget.value == '') {
      target = e.currentTarget.placeholder;
    }
    console.log(target);
    $('#profile-icon').html(jdenticon.toSvg(target, 64));
  });

  $('#card-input').on('keypress', e => {
    if (e.code == 'Enter') {
      axios
        .post(`/profile/${$('#refid').text()}/card`, { cid: $('#card-input').val() })
        .then(response => {
          window.location.reload(true);
        })
        .catch(error => {
          window.location.reload(true);
        });
    }
  });

  $('#add-card').on('click', e => {
    axios
      .post(`/profile/${$('#refid').text()}/card`, { cid: $('#card-input').val() })
      .then(response => {
        window.location.reload(true);
      })
      .catch(error => {
        window.location.reload(true);
      });
  });

  $('.ecard-delete').on('click', e => {
    axios
      .delete(`/card/${e.currentTarget.getAttribute('deleting')}`)
      .then(response => {
        window.location.reload(true);
      })
      .catch(error => {
        window.location.reload(true);
      });
  });
})();
