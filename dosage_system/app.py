import streamlit as st
import requests
import json
import pandas as pd
from datetime import datetime
import plotly.express as px
import plotly.graph_objects as go
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import io
import base64

# Configure Streamlit page
st.set_page_config(
    page_title="🧠 Drug Interaction Detection System",
    page_icon="🧠",
    layout="wide",
    initial_sidebar_state="collapsed"
)

# Custom CSS for dark neon theme
st.markdown("""
<style>
    .stApp {
        background: linear-gradient(135deg, #0B1020 0%, #12172A 100%);
        color: #FFFFFF;
    }
    
    .main-header {
        background: linear-gradient(90deg, #00E5FF 0%, #4CD4B0 100%);
        padding: 1rem 2rem;
        border-radius: 15px;
        margin-bottom: 2rem;
        box-shadow: 0 0 30px rgba(0, 229, 255, 0.3);
    }
    
    .metric-card {
        background: #12172A;
        padding: 1.5rem;
        border-radius: 12px;
        border: 1px solid rgba(0, 229, 255, 0.3);
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.1);
        margin: 1rem 0;
    }
    
    .alert-amber {
        background: rgba(255, 214, 107, 0.1);
        border: 1px solid #FFD66B;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 0 15px rgba(255, 214, 107, 0.2);
    }
    
    .alert-red {
        background: rgba(255, 92, 92, 0.1);
        border: 1px solid #FF5C5C;
        border-radius: 8px;
        padding: 1rem;
        box-shadow: 0 0 15px rgba(255, 92, 92, 0.2);
    }
    
    .stButton > button {
        background: linear-gradient(45deg, #00E5FF, #4CD4B0);
        color: #0B1020;
        border: none;
        border-radius: 25px;
        padding: 0.75rem 2rem;
        font-weight: 600;
        box-shadow: 0 0 20px rgba(0, 229, 255, 0.4);
        transition: all 0.3s ease;
    }
    
    .stButton > button:hover {
        box-shadow: 0 0 30px rgba(0, 229, 255, 0.6);
        transform: translateY(-2px);
    }
</style>
""", unsafe_allow_html=True)

# Header
st.markdown("""
<div class="main-header">
    <h1 style="margin: 0; color: #0B1020; font-size: 2.5rem; font-weight: 700;">
        🧠 Drug Interaction Detection System
    </h1>
    <p style="margin: 0.5rem 0 0 0; color: #0B1020; font-size: 1.1rem;">
        AI-Powered Dosage Recommendations & Safety Analysis
    </p>
</div>
""", unsafe_allow_html=True)

# Initialize session state
if 'analysis_results' not in st.session_state:
    st.session_state.analysis_results = None
if 'patient_history' not in st.session_state:
    st.session_state.patient_history = []

# Main input form
with st.container():
    col1, col2 = st.columns([2, 1])
    
    with col1:
        st.markdown("### 📋 Patient Information")
        
        # Patient details
        col_age, col_weight = st.columns(2)
        with col_age:
            patient_age = st.number_input("Patient Age", min_value=0, max_value=120, value=35, key="age")
        with col_weight:
            patient_weight = st.number_input("Weight (kg)", min_value=0.0, max_value=300.0, value=70.0, key="weight")
        
        drug_name = st.text_input("Drug Name", placeholder="e.g., Warfarin, Aspirin, Metformin", key="drug")
        
        col_gender, col_conditions = st.columns(2)
        with col_gender:
            gender = st.selectbox("Gender", ["Male", "Female", "Other"], key="gender")
        with col_conditions:
            medical_conditions = st.text_input("Medical Conditions", placeholder="e.g., Diabetes, Hypertension", key="conditions")
    
    with col2:
        st.markdown("### ⚡ Quick Actions")
        
        # Analyze button with glow effect
        if st.button("🔍 Analyze Drug Safety", key="analyze", use_container_width=True):
            if drug_name:
                with st.spinner("🧠 AI Analysis in Progress..."):
                    # Simulate API call to FastAPI backend
                    analysis_data = {
                        "patient_age": patient_age,
                        "drug_name": drug_name,
                        "weight": patient_weight,
                        "gender": gender,
                        "medical_conditions": medical_conditions
                    }
                    
                    # Mock analysis results (replace with actual API call)
                    st.session_state.analysis_results = {
                        "dosage_range": f"{patient_age * 2}-{patient_age * 4} mg",
                        "frequency": "twice daily" if patient_age < 65 else "once daily",
                        "safety_score": 85 if patient_age < 65 else 72,
                        "warnings": ["Reduce dose for elderly patients", "Monitor kidney function"] if patient_age >= 65 else [],
                        "interactions": ["Warfarin + Aspirin: High bleeding risk"] if "warfarin" in drug_name.lower() else [],
                        "alternatives": ["Consider Apixaban as safer alternative"] if patient_age >= 65 else []
                    }
                    
                    # Add to patient history
                    st.session_state.patient_history.append({
                        "timestamp": datetime.now(),
                        "drug": drug_name,
                        "age": patient_age,
                        "dosage": st.session_state.analysis_results["dosage_range"]
                    })
                    
                st.success("✅ Analysis Complete!")
            else:
                st.error("Please enter a drug name")

# Display results
if st.session_state.analysis_results:
    results = st.session_state.analysis_results
    
    st.markdown("---")
    st.markdown("## 📊 Analysis Results")
    
    # Metrics row
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #00E5FF; margin: 0;">Recommended Dose</h3>
            <h2 style="color: #FFFFFF; margin: 0.5rem 0;">{}</h2>
            <p style="color: #B0BEC5; margin: 0;">{}</p>
        </div>
        """.format(results["dosage_range"], results["frequency"]), unsafe_allow_html=True)
    
    with col2:
        safety_color = "#4CD4B0" if results["safety_score"] >= 80 else "#FFD66B" if results["safety_score"] >= 60 else "#FF5C5C"
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #00E5FF; margin: 0;">Safety Score</h3>
            <h2 style="color: {}; margin: 0.5rem 0;">{}/100</h2>
            <p style="color: #B0BEC5; margin: 0;">Risk Assessment</p>
        </div>
        """.format(safety_color, results["safety_score"]), unsafe_allow_html=True)
    
    with col3:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #00E5FF; margin: 0;">Interactions</h3>
            <h2 style="color: #FF5C5C; margin: 0.5rem 0;">{}</h2>
            <p style="color: #B0BEC5; margin: 0;">Detected</p>
        </div>
        """.format(len(results["interactions"])), unsafe_allow_html=True)
    
    with col4:
        st.markdown("""
        <div class="metric-card">
            <h3 style="color: #00E5FF; margin: 0;">Alternatives</h3>
            <h2 style="color: #4CD4B0; margin: 0.5rem 0;">{}</h2>
            <p style="color: #B0BEC5; margin: 0;">Available</p>
        </div>
        """.format(len(results["alternatives"])), unsafe_allow_html=True)
    
    # Safety gauge
    fig = go.Figure(go.Indicator(
        mode = "gauge+number",
        value = results["safety_score"],
        domain = {'x': [0, 1], 'y': [0, 1]},
        title = {'text': "Safety Score"},
        gauge = {
            'axis': {'range': [None, 100]},
            'bar': {'color': "#00E5FF"},
            'steps': [
                {'range': [0, 50], 'color': "#FF5C5C"},
                {'range': [50, 80], 'color': "#FFD66B"},
                {'range': [80, 100], 'color': "#4CD4B0"}
            ],
            'threshold': {
                'line': {'color': "white", 'width': 4},
                'thickness': 0.75,
                'value': 90
            }
        }
    ))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={'color': "white"}
    )
    st.plotly_chart(fig, use_container_width=True)
    
    # Alerts section
    if results["warnings"] or results["interactions"]:
        st.markdown("### ⚠️ Safety Alerts")
        
        for warning in results["warnings"]:
            st.markdown(f"""
            <div class="alert-amber">
                <strong>⚠️ Warning:</strong> {warning}
            </div>
            """, unsafe_allow_html=True)
        
        for interaction in results["interactions"]:
            st.markdown(f"""
            <div class="alert-red">
                <strong>🚨 Critical:</strong> {interaction}
            </div>
            """, unsafe_allow_html=True)
    
    # Alternatives
    if results["alternatives"]:
        st.markdown("### 💡 Alternative Recommendations")
        for alt in results["alternatives"]:
            st.info(f"💊 {alt}")
    
    # Export options
    st.markdown("### 📄 Export Options")
    col1, col2 = st.columns(2)
    
    with col1:
        if st.button("📄 Export PDF Report", use_container_width=True):
            # Generate PDF report
            buffer = io.BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            story = []
            
            story.append(Paragraph("Drug Safety Analysis Report", styles['Title']))
            story.append(Spacer(1, 12))
            story.append(Paragraph(f"Patient Age: {patient_age}", styles['Normal']))
            story.append(Paragraph(f"Drug: {drug_name}", styles['Normal']))
            story.append(Paragraph(f"Recommended Dose: {results['dosage_range']}", styles['Normal']))
            story.append(Paragraph(f"Safety Score: {results['safety_score']}/100", styles['Normal']))
            
            doc.build(story)
            buffer.seek(0)
            
            st.download_button(
                label="Download PDF",
                data=buffer.getvalue(),
                file_name=f"drug_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf",
                mime="application/pdf"
            )
    
    with col2:
        if st.button("📊 Export CSV Data", use_container_width=True):
            # Create CSV data
            csv_data = pd.DataFrame([{
                "Timestamp": datetime.now(),
                "Drug": drug_name,
                "Patient_Age": patient_age,
                "Dosage_Range": results["dosage_range"],
                "Safety_Score": results["safety_score"],
                "Warnings": "; ".join(results["warnings"]),
                "Interactions": "; ".join(results["interactions"])
            }])
            
            st.download_button(
                label="Download CSV",
                data=csv_data.to_csv(index=False),
                file_name=f"drug_analysis_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                mime="text/csv"
            )

# Patient history visualization
if st.session_state.patient_history:
    st.markdown("---")
    st.markdown("### 📈 Patient History")
    
    history_df = pd.DataFrame(st.session_state.patient_history)
    
    # Create timeline chart
    fig = px.scatter(history_df, x="timestamp", y="age", 
                    hover_data=["drug", "dosage"],
                    title="Prescription Timeline")
    fig.update_traces(marker=dict(size=12, color="#00E5FF"))
    fig.update_layout(
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font={'color': "white"}
    )
    st.plotly_chart(fig, use_container_width=True)

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #B0BEC5; padding: 2rem;">
    <p><strong>Medical Disclaimer:</strong> This system provides educational information only. 
    Always consult healthcare professionals for medical advice.</p>
    <p>Powered by IBM Watson NLU • Hugging Face • FastAPI • Streamlit</p>
</div>
""", unsafe_allow_html=True)
