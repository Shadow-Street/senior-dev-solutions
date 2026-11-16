import { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Download, FileText, Loader2 } from 'lucide-react';
import { apiErrorMessage } from '@/lib/subscriptionApi';
import { fetchPrivateFile } from '@/lib/privateFiles';

/**
 * Shows a private document (SEBI certificate, KYC) inside the page.
 * `fileKey` null closes it. PDFs render in a frame and images inline, both
 * from a blob URL with a type decided from the file's bytes; any other file
 * is offered as a download only, so it can never render as a page here.
 */
export default function PrivateDocumentViewer({ fileKey, title = 'Document', description, onClose }) {
  const [state, setState] = useState({ status: 'idle' });

  useEffect(() => {
    if (!fileKey) { setState({ status: 'idle' }); return undefined; }
    let cancelled = false;
    let loaded = null;
    setState({ status: 'loading' });
    fetchPrivateFile(fileKey)
      .then((file) => {
        if (cancelled) { file.revoke(); return; }
        loaded = file;
        setState({ status: 'ready', file });
      })
      .catch((error) => {
        if (cancelled) return;
        const status = error?.response?.status;
        setState({
          status: 'error',
          message: status === 404
            ? 'The document file could not be found. Ask the applicant to upload it again.'
            : apiErrorMessage(error, 'Could not load the document. Please try again.'),
        });
      });
    return () => {
      cancelled = true;
      if (loaded) loaded.revoke();
    };
  }, [fileKey]);

  const file = state.status === 'ready' ? state.file : null;

  return (
    <Dialog open={Boolean(fileKey)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-4xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" aria-hidden="true" />
            {title}
          </DialogTitle>
          <DialogDescription>{description || 'Private document. Only reviewers and the applicant can open it.'}</DialogDescription>
        </DialogHeader>

        {state.status === 'loading' && (
          <div className="flex h-[60vh] items-center justify-center" role="status">
            <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading document</span>
          </div>
        )}

        {state.status === 'error' && (
          <div role="alert" className="flex items-start gap-3 rounded-lg border border-sell/30 bg-sell-muted p-4">
            <AlertTriangle className="w-5 h-5 shrink-0 text-sell-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-sell-muted-foreground">{state.message}</p>
          </div>
        )}

        {file?.kind === 'pdf' && (
          <iframe title={title} src={file.url} className="h-[70vh] w-full rounded-lg border border-border" />
        )}
        {file?.kind === 'image' && (
          <div className="flex max-h-[70vh] justify-center overflow-auto rounded-lg border border-border bg-surface-2 p-2">
            <img src={file.url} alt={title} className="max-w-full object-contain" />
          </div>
        )}
        {file?.kind === 'download' && (
          <p className="text-sm text-subtle">This file type cannot be previewed here. Download it to open it.</p>
        )}

        {file && (
          <div className="flex justify-end">
            <Button asChild variant="outline">
              <a href={file.url} download={file.filename}>
                <Download className="w-4 h-4 mr-2" aria-hidden="true" />Download
              </a>
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

PrivateDocumentViewer.propTypes = {
  fileKey: PropTypes.string,
  title: PropTypes.string,
  description: PropTypes.string,
  onClose: PropTypes.func.isRequired,
};
