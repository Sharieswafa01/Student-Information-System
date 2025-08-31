<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0"
  xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

  <xsl:template match="/">
    <html>
      <head>
        <style>
          body {
            background: #f7f7fb;
            font-family: system-ui, -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
            margin: 0;
            padding: 20px;
          }
          h2 {
            text-align: center;
            margin-bottom: 16px;
            font-size: 1.5rem;
            color: #333;
          }
          table {
            width: 85%;
            margin: 0 auto 20px auto;
            border-collapse: collapse;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.08);
            background: white;
          }
          th, td {
            padding: 12px 14px;
            text-align: center;
          }
          th {
            background: #2563eb;
            color: #fff;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          tr:nth-child(even) {
            background: #f9f9f9;
          }
          tr:hover {
            background: #e8f0fe;
            transition: background 0.2s ease;
          }
        </style>
      </head>
      <body>
       
          <xsl:for-each select="students/student">
            <tr>
              <td><xsl:value-of select="@id"/></td>
              <td><xsl:value-of select="name"/></td>
              <td><xsl:value-of select="course"/></td>
              <td><xsl:value-of select="grade"/></td>
            </tr>
          </xsl:for-each>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
