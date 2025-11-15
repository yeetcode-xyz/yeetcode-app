import React, { useEffect, useRef } from 'react';

const LivePreview = ({ html, css, js }) => {
  const iframeRef = useRef(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const document = iframe.contentDocument;
    if (!document) return;

    const content = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * {
              box-sizing: border-box;
            }
            body {
              margin: 0;
              padding: 0;
              font-family: system-ui, -apple-system, sans-serif;
            }
            ${css}
          </style>
        </head>
        <body>
          ${html}
          <script>
            try {
              ${js}
            } catch (error) {
              console.error('Error in user code:', error);
              document.body.innerHTML = '<div style="padding: 20px; background: #fee2e2; color: #991b1b; border-left: 4px solid #dc2626; margin: 20px; font-family: monospace; white-space: pre-wrap;"><strong>Error:</strong>\\n' + error.toString() + '</div>' + document.body.innerHTML;
            }
          </script>
        </body>
      </html>
    `;

    document.open();
    document.write(content);
    document.close();
  }, [html, css, js]);

  return (
    <div className="h-full w-full relative">
      <iframe
        ref={iframeRef}
        title="preview"
        sandbox="allow-scripts"
        className="w-full h-full border-none bg-white"
        style={{ width: '100%', height: '100%' }}
      />
      <div className="absolute bottom-0 left-0 right-0 bg-gray-800 text-white text-xs px-3 py-1 border-t-2 border-black">
        💻 Preview updates automatically as you type
      </div>
    </div>
  );
};

export default LivePreview;
