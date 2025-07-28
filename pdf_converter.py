#!/usr/bin/env python3
"""
PDF Converter Script
Converts PDF files to TXT and XML formats using pdfplumber
"""

import os
import sys
import argparse
from pathlib import Path
import pdfplumber
import xml.etree.ElementTree as ET
from xml.dom import minidom
from datetime import datetime

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using pdfplumber"""
    text_content = []
    metadata = {}
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            # Extract metadata
            metadata = {
                'title': pdf.metadata.get('Title', 'Unknown'),
                'author': pdf.metadata.get('Author', 'Unknown'),
                'creator': pdf.metadata.get('Creator', 'Unknown'),
                'pages': len(pdf.pages),
                'created': pdf.metadata.get('CreationDate', 'Unknown'),
                'modified': pdf.metadata.get('ModDate', 'Unknown')
            }
            
            # Extract text from each page
            for page_num, page in enumerate(pdf.pages, 1):
                page_text = page.extract_text()
                if page_text:
                    text_content.append({
                        'page': page_num,
                        'text': page_text.strip()
                    })
                else:
                    text_content.append({
                        'page': page_num,
                        'text': f"[Page {page_num} - No extractable text]"
                    })
    
    except Exception as e:
        raise Exception(f"Error reading PDF: {str(e)}")
    
    return text_content, metadata

def convert_pdf_to_txt(pdf_path, output_path=None, include_metadata=True):
    """Convert PDF to TXT format"""
    
    # Determine output path
    if output_path is None:
        pdf_file = Path(pdf_path)
        output_path = pdf_file.parent / f"{pdf_file.stem}.txt"
    
    print(f"Converting {pdf_path} to TXT...")
    
    try:
        # Extract content
        text_content, metadata = extract_text_from_pdf(pdf_path)
        
        # Build TXT content
        txt_lines = []
        
        if include_metadata:
            txt_lines.extend([
                "PDF Text Extraction - Full Document",
                "=" * 50,
                "",
                f"Source File: {Path(pdf_path).name}",
                f"Title: {metadata['title']}",
                f"Author: {metadata['author']}",
                f"Pages: {metadata['pages']}",
                f"Extracted: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                "",
                "=" * 50,
                ""
            ])
        
        # Add page content
        for page_data in text_content:
            txt_lines.extend([
                f"--- Page {page_data['page']} ---",
                page_data['text'],
                ""
            ])
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write('\n'.join(txt_lines))
        
        print(f"SUCCESS: TXT file created: {output_path}")
        print(f"   Pages extracted: {len(text_content)}")
        return str(output_path)
        
    except Exception as e:
        print(f"ERROR: Converting to TXT: {e}")
        return None

def convert_pdf_to_xml(pdf_path, output_path=None, include_metadata=True):
    """Convert PDF to XML format"""
    
    # Determine output path
    if output_path is None:
        pdf_file = Path(pdf_path)
        output_path = pdf_file.parent / f"{pdf_file.stem}.xml"
    
    print(f"Converting {pdf_path} to XML...")
    
    try:
        # Extract content
        text_content, metadata = extract_text_from_pdf(pdf_path)
        
        # Create XML structure
        root = ET.Element("document")
        
        # Add metadata if requested
        if include_metadata:
            meta_elem = ET.SubElement(root, "metadata")
            ET.SubElement(meta_elem, "source_file").text = Path(pdf_path).name
            ET.SubElement(meta_elem, "title").text = str(metadata['title'])
            ET.SubElement(meta_elem, "author").text = str(metadata['author'])
            ET.SubElement(meta_elem, "creator").text = str(metadata['creator'])
            ET.SubElement(meta_elem, "pages").text = str(metadata['pages'])
            ET.SubElement(meta_elem, "created").text = str(metadata['created'])
            ET.SubElement(meta_elem, "modified").text = str(metadata['modified'])
            ET.SubElement(meta_elem, "extracted").text = datetime.now().isoformat()
        
        # Add content
        content_elem = ET.SubElement(root, "content")
        
        for page_data in text_content:
            page_elem = ET.SubElement(content_elem, "page", number=str(page_data['page']))
            page_elem.text = page_data['text']
        
        # Create pretty XML
        xml_str = ET.tostring(root, encoding='unicode')
        pretty_xml = minidom.parseString(xml_str).toprettyxml(indent="  ")
        
        # Remove empty lines that minidom adds
        lines = [line for line in pretty_xml.split('\n') if line.strip()]
        clean_xml = '\n'.join(lines)
        
        # Write to file
        with open(output_path, 'w', encoding='utf-8') as f:
            f.write(clean_xml)
        
        print(f"SUCCESS: XML file created: {output_path}")
        print(f"   Pages extracted: {len(text_content)}")
        return str(output_path)
        
    except Exception as e:
        print(f"ERROR: Converting to XML: {e}")
        return None

def batch_convert(input_dir, output_dir=None, format_type='both', include_metadata=True):
    """Convert all PDF files in a directory"""
    
    input_path = Path(input_dir)
    if not input_path.exists():
        print(f"ERROR: Input directory does not exist: {input_dir}")
        return
    
    # Find PDF files
    pdf_files = list(input_path.glob("*.pdf"))
    if not pdf_files:
        print(f"ERROR: No PDF files found in: {input_dir}")
        return
    
    print(f"Found {len(pdf_files)} PDF files to convert...")
    
    # Set output directory
    if output_dir is None:
        output_path = input_path
    else:
        output_path = Path(output_dir)
        output_path.mkdir(parents=True, exist_ok=True)
    
    results = {'txt': [], 'xml': [], 'errors': []}
    
    for pdf_file in pdf_files:
        print(f"\nProcessing: {pdf_file.name}")
        
        try:
            # Convert to TXT
            if format_type in ['txt', 'both']:
                txt_output = output_path / f"{pdf_file.stem}.txt"
                txt_result = convert_pdf_to_txt(pdf_file, txt_output, include_metadata)
                if txt_result:
                    results['txt'].append(txt_result)
            
            # Convert to XML
            if format_type in ['xml', 'both']:
                xml_output = output_path / f"{pdf_file.stem}.xml"
                xml_result = convert_pdf_to_xml(pdf_file, xml_output, include_metadata)
                if xml_result:
                    results['xml'].append(xml_result)
                    
        except Exception as e:
            error_msg = f"{pdf_file.name}: {str(e)}"
            results['errors'].append(error_msg)
            print(f"ERROR: Processing {pdf_file.name}: {e}")
    
    # Print summary
    print(f"\n" + "=" * 50)
    print("CONVERSION SUMMARY")
    print("=" * 50)
    print(f"TXT files created: {len(results['txt'])}")
    print(f"XML files created: {len(results['xml'])}")
    print(f"Errors: {len(results['errors'])}")
    
    if results['errors']:
        print("\nErrors encountered:")
        for error in results['errors']:
            print(f"  - {error}")

def main():
    """Main function with command line interface"""
    parser = argparse.ArgumentParser(
        description="Convert PDF files to TXT and/or XML format using pdfplumber",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python pdf_converter.py document.pdf                    # Convert to both TXT and XML
  python pdf_converter.py document.pdf --format txt       # Convert to TXT only
  python pdf_converter.py document.pdf --format xml       # Convert to XML only
  python pdf_converter.py --batch input_folder/           # Convert all PDFs in folder
  python pdf_converter.py document.pdf --output output/   # Specify output location
  python pdf_converter.py document.pdf --no-metadata      # Skip metadata in output
"""
    )
    
    parser.add_argument('input', nargs='?', help='Input PDF file or directory')
    parser.add_argument('--format', choices=['txt', 'xml', 'both'], default='both',
                       help='Output format (default: both)')
    parser.add_argument('--output', '-o', help='Output file or directory')
    parser.add_argument('--batch', action='store_true', 
                       help='Batch convert all PDFs in input directory')
    parser.add_argument('--no-metadata', action='store_true',
                       help='Skip metadata in output files')
    parser.add_argument('--list-deps', action='store_true',
                       help='List required dependencies')
    
    args = parser.parse_args()
    
    # Handle special commands
    if args.list_deps:
        print("Required dependencies:")
        print("  pip install pdfplumber")
        return
    
    if not args.input:
        parser.print_help()
        return
    
    # Check if pdfplumber is available
    try:
        import pdfplumber
    except ImportError:
        print("ERROR: pdfplumber not installed. Install with: pip install pdfplumber")
        return
    
    include_metadata = not args.no_metadata
    
    # Batch conversion
    if args.batch:
        batch_convert(args.input, args.output, args.format, include_metadata)
        return
    
    # Single file conversion
    input_file = Path(args.input)
    if not input_file.exists():
        print(f"ERROR: File does not exist: {args.input}")
        return
    
    if input_file.suffix.lower() != '.pdf':
        print(f"ERROR: Input file must be a PDF: {args.input}")
        return
    
    print(f"Converting PDF: {input_file.name}")
    print(f"Format: {args.format}")
    print(f"Include metadata: {include_metadata}")
    print()
    
    # Convert based on format choice
    if args.format in ['txt', 'both']:
        txt_output = args.output if args.output and args.format == 'txt' else None
        convert_pdf_to_txt(args.input, txt_output, include_metadata)
    
    if args.format in ['xml', 'both']:
        xml_output = args.output if args.output and args.format == 'xml' else None
        convert_pdf_to_xml(args.input, xml_output, include_metadata)

if __name__ == "__main__":
    main()
