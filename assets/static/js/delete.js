/* Delete Button */
(() => {
  let deleting = null;
  let confirming = false;
  let canDelete = false;
  let timer1 = null;
  let timer2 = null;
  $('.data-delete-button').on('click', e => {
    $('#confirm-delete').toggleClass('is-deleting', false);
    canDelete = false;
    confirming = false;
    if (timer1 != null) clearTimeout(timer1);
    if (timer2 != null) clearTimeout(timer2);
    deleting = e.currentTarget.getAttribute('deleting');
    const name = e.currentTarget.getAttribute('deleting-name');
    $('#confirm-modal-title').text(`${name}`);
  });

  $('#confirm-delete').on('click', _ => {
    if (!confirming) {
      confirming = true;
      $('#confirm-delete').toggleClass('is-deleting', true);
      timer1 = setTimeout(() => {
        canDelete = true;
        timer1 = null;
      }, 500);

      timer2 = setTimeout(() => {
        $('#confirm-delete').toggleClass('is-deleting', false);
        canDelete = false;
        confirming = false;
        timer2 = null;
      }, 3000);
    }

    if (canDelete) {
      if (deleting == null) {
        location.reload(true);
      }
      axios
        .delete(`${$('#confirm-delete').attr('data-url')}${deleting}`)
        .then(response => {
          location.reload(true);
        })
        .catch(error => {
          location.reload(true);
        });
    }
  });
})();
