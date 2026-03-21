const test = require('node:test');
const assert = require('node:assert/strict');
const { createM4Harness } = require('./helpers/m4-harness');

test('documents upload, list, and delete work in offline mode', async () => {
  const harness = await createM4Harness();

  try {
    const actor = { id: 'u_admin', name: 'Admin User', authType: 'jwt' };
    const upload = await harness.invoke(harness.contactsRoutes.handlers.uploadContactDocument, {
      params: { id: '1' },
      body: {
        filename: 'invoice.pdf',
        mime_type: 'application/pdf',
        content: 'invoice body'
      },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(upload.error, null);
    assert.equal(upload.res.statusCode, 201);
    assert.equal(upload.res.body.document.record_type, 'contacts');
    assert.equal(upload.res.body.document.record_id, '1');
    assert.equal(upload.res.body.document.nextcloud_path, '/ERP-Documents/contacts/1/invoice.pdf');
    assert.equal(upload.res.body.document.metadata.offline, true);

    const list = await harness.invoke(harness.documentsRoutes.handlers.listDocuments, {
      params: { type: 'contacts', id: '1' },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(list.error, null);
    assert.equal(list.res.statusCode, 200);
    assert.equal(list.res.body.documents.length, 1);
    assert.equal(list.res.body.documents[0].filename, 'invoice.pdf');

    const deleteResult = await harness.invoke(harness.documentsRoutes.handlers.deleteDocument, {
      params: { id: upload.res.body.document.id },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(deleteResult.error, null);
    assert.equal(deleteResult.res.statusCode, 200);
    assert.equal(deleteResult.res.body.deleted, true);

    const emptyList = await harness.invoke(harness.documentsRoutes.handlers.listDocuments, {
      params: { type: 'contacts', id: '1' },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(emptyList.error, null);
    assert.equal(emptyList.res.body.documents.length, 0);
  } finally {
    await harness.close();
  }
});

test('uploading a contact document for a missing contact returns 404', async () => {
  const harness = await createM4Harness();

  try {
    const actor = { id: 'u_admin', name: 'Admin User', authType: 'jwt' };
    const result = await harness.invoke(harness.contactsRoutes.handlers.uploadContactDocument, {
      params: { id: '9999' },
      body: {
        filename: 'missing.pdf',
        content: 'missing'
      },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(result.res.statusCode, 200);
    assert.equal(result.error.statusCode, 404);
    assert.equal(result.error.message, 'Contact not found');
  } finally {
    await harness.close();
  }
});

test('deleting a missing document returns 404', async () => {
  const harness = await createM4Harness();

  try {
    const actor = { id: 'u_admin', name: 'Admin User', authType: 'jwt' };
    const result = await harness.invoke(harness.documentsRoutes.handlers.deleteDocument, {
      params: { id: '9999' },
      user: actor,
      auth: { user: actor }
    });

    assert.equal(result.res.statusCode, 200);
    assert.equal(result.error.statusCode, 404);
    assert.equal(result.error.message, 'Document not found');
  } finally {
    await harness.close();
  }
});
