/* Delete Button */
(() => {
  let deleting = null;
  $('.profile-delete').on('click', e => {
    deleting = e.currentTarget.getAttribute('deleting');
    const name = e.currentTarget.getAttribute('deleting-name');
    $('#confirm-modal-title').text(`Deleting ${name}`);
  });

  $('#confirm-delete').on('click', _ => {
    if (deleting == null) {
      location.reload(true);
    }
    axios
      .delete(`/profile/${deleting}`)
      .then(response => {
        location.reload(true);
      })
      .catch(error => {
        location.reload(true);
      });
  });
})();
