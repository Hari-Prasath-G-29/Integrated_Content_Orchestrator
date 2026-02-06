//new
import React, { useState, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Container, Paper, Typography, Box, Radio, IconButton,
  Button, Divider, Chip, Accordion, AccordionSummary, AccordionDetails, TextField,
  CircularProgress // Added to fix 'CircularProgress' is not defined
} from "@mui/material";
import {
  Edit as EditIcon, ExpandMore as ExpandMoreIcon, Language as LanguageIcon,
  Public as PublicIcon, CellTower as ChannelIcon, Check as CheckIcon,
  ArrowForward as ArrowForwardIcon, ArrowBack as ArrowBackIcon
} from "@mui/icons-material";

// Primary Market Data (fill missing name)
const MARKET_DATA = [
  { id: "japan",   name: "Japan",   lang: "Japanese", flag: "🇯🇵", color: "#1e278cff" },
  { id: "china",   name: "China",   lang: "Chinese",  flag: "🇨🇳", color: "#b71c1c" },
  { id: "germany", name: "Germany", lang: "German",   flag: "🇩🇪", color: "#263238" },
];

// Coming Soon Data – pastel palette
const COMING_SOON_DATA = [
  { name: "France",    flag: "🇫🇷", color: "#E8F0FE" }, // light blue
  { name: "Spain",     flag: "🇪🇸", color: "#FFF7DB" }, // pale yellow
  { name: "Italy",     flag: "🇮🇹", color: "#EAF6EA" }, // mint green
  { name: "Brazil",    flag: "🇧🇷", color: "#E6F5EE" }, // deeper mint
  { name: "Mexico",    flag: "🇲🇽", color: "#FDE8EF" }, // soft pink
  { name: "Canada",    flag: "🇨🇦", color: "#FFE7E7" }, // blush red
  { name: "Australia", flag: "🇦🇺", color: "#EFE7FF" }, // lavender
];

const AssetImportContext = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // State
  const [projectName, setProjectName] = useState(location.state?.projectName || "Adaptation Project");
  const [isEditingName, setIsEditingName] = useState(false);
  const content = location.state?.content || "No strategic context/content provided.";
  const [selectedMarket, setSelectedMarket] = useState(null);

  // Added states to fix 'isLoadingPriority' and 'activePriority' is not defined errors
  const [isLoadingPriority, setIsLoadingPriority] = useState(false);
  const [activePriority, setActivePriority] = useState(null);

  const handleToggle = (market) => {
    setSelectedMarket(market);
    
    // Logic for loading delay
    setActivePriority(null);
    setIsLoadingPriority(true);
    
    setTimeout(() => {
      setIsLoadingPriority(false);
      // Setting priority based on market
      const priority = market.id === "germany" ? "Medium" : "High";
      setActivePriority(priority);
    }, 2000);
  };

  const estTimeline = useMemo(() => {
    if (!selectedMarket) return "0 weeks";
    // Using activePriority to mimic the data structure you had
    return selectedMarket.id === "germany" ? "7 weeks" : "10 weeks";
  }, [selectedMarket]);

  const handleCreateProjectAndContinue = () => {
    navigate("/globalAssetCapture", {
      state: { projectName, content, lang: selectedMarket?.lang },
    });
  };

  // Highlights
  const blueHighlight = { bgcolor: "#E3F2FD", color: "#1976D2", fontWeight: "bold", border: "1px solid #BBDEFB" };
  const hoverSx = { transition: "0.3s", "&:hover": { transform: "translateY(-2px)", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", cursor: "pointer" } };

  return (
    <Container maxWidth="md" className="py-5">
      {/* Header Section */}
      <Box className="d-flex align-items-center mb-4">
        <IconButton className="me-2" onClick={() => navigate(-1)} aria-label="Back">
          <ArrowBackIcon />
        </IconButton>
        <Box>
          <Typography variant="h5" fontWeight="bold">Import Content for Adaptation</Typography>
          <Typography variant="body2" color="textSecondary">Configure target markets, languages, and channels</Typography>
        </Box>
      </Box>

      {/* Project Name Card - Functional Edit */}
      <Paper variant="outlined" sx={{ ...hoverSx, p: 3, mb: 3 }} className="d-flex justify-content-between align-items-center">
        <Box sx={{ flexGrow: 1 }}>
          {isEditingName ? (
            <TextField 
              size="small" value={projectName} variant="standard" autoFocus
              onChange={(e) => setProjectName(e.target.value)}
              onBlur={() => setIsEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setIsEditingName(false)}
            />
          ) : (
            <Typography><span className="text-secondary me-2">Project Name:</span><strong>{projectName}</strong></Typography>
          )}
        </Box>
        <Button 
          startIcon={isEditingName ? <CheckIcon /> : <EditIcon />} 
          size="small" color={isEditingName ? "primary" : "inherit"} 
          onClick={() => setIsEditingName(!isEditingName)}
        >
          {isEditingName ? "Save" : "Edit"}
        </Button>
      </Paper>

      {/* Strategic Context */}
      <Accordion variant="outlined" className="mb-4 shadow-none" defaultExpanded sx={hoverSx}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography component="div" className="d-flex align-items-center">
            <strong>Strategic Context</strong>
            <Box sx={{ ...blueHighlight, px: 1, py: 0.2, borderRadius: 1, fontSize: "0.75rem", ms: 2, ml: 1 }}>
              From Source Asset
            </Box>
          </Typography>
        </AccordionSummary>
        {/* <AccordionDetails>
          <Typography variant="body2" sx={{ color: "rgba(0,0,0,0.6)", whiteSpace: "pre-wrap" }}>{content}</Typography>
        </AccordionDetails> */}
      </Accordion>

      {/* Target Markets Selection - Radio Buttons */}
      <Paper variant="outlined" className="p-4 mb-4" sx={hoverSx}>
        <Box className="d-flex align-items-center mb-1">
          <PublicIcon className="me-2" fontSize="small" />
          <Typography variant="h6">Target Market</Typography>
        </Box>
        <Typography variant="body2" color="textSecondary" className="mb-4">Select a target market for glocalization</Typography>

      <Box className="d-flex flex-column gap-2">
      {MARKET_DATA.map((market) => (
        <Box
          key={market.id}
          onClick={() => handleToggle(market)}
          className={`d-flex align-items-center justify-content-between p-2 border rounded market-row market-${market.id}`}
          style={{ 
            backgroundColor: selectedMarket?.id === market.id ? "#f0f7ff" : "white", 
            borderColor: selectedMarket?.id === market.id ? "#1976D2" : "#e0e0e0",
            cursor: "pointer", 
            transition: "0.2s" 
          }}
        >
      {/* Left Side: Radio, Flag, and Names */}
        <Box className="d-flex align-items-center">
        <Radio checked={selectedMarket?.id === market.id} />
        <Typography className="ms-2 d-flex align-items-center">
          <span className="market-flag me-2" style={{ fontSize: "1.2rem" }}>{market.flag}</span>
          <strong>{market.name}</strong>
          <span className="text-secondary ms-1">({market.lang})</span>
        </Typography>
      </Box>

      {/* Right Side: Logic for Loading and Priority */}
      <Box className="d-flex align-items-center me-3" sx={{ minWidth: 100, justifyContent: 'flex-end' }}>
        {selectedMarket?.id === market.id ? (
          isLoadingPriority ? (
            <CircularProgress size={20} thickness={5} />
          ) : activePriority ? (
            <Chip 
              label={activePriority} 
              size="small" 
              sx={{ 
                fontWeight: "bold", 
                bgcolor: activePriority === "High" ? "#feebee" : "#f5f5f5",
                color: activePriority === "High" ? "#c62828" : "#616161"
              }} 
            />
          ) : null
        ) : (
          /* Placeholder to keep row height consistent when not selected */
          <Box style={{ height: 24 }} />
        )}
      </Box>
    </Box>
  ))}
</Box>

        {/* Coming Soon Section - Improved Spacing and Layout */}
<Box className="mt-5 pt-3">
  <Typography 
    variant="caption" 
    color="textSecondary" 
    sx={{ 
      fontWeight: "bold", 
      textTransform: "uppercase", 
      display: "block", 
      mb: 2,
      letterSpacing: 0.5 
    }}
  >
    Coming Soon:
  </Typography>

  <Box className="d-flex flex-wrap" sx={{ gap: 2.5 }}>
    {COMING_SOON_DATA.map((item) => (
      <Chip
          key={item.name}
          label={
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <span className="chip-flag" style={{ fontSize: "1.1rem", marginRight: "10px" }}>{item.flag}</span>
            <span className="cs-name">{item.name}</span>
          </Box>
          }
          className={`coming-soon-chip cs-${item.name.toLowerCase().replace(/\s+/g,'-')}`}
          sx={{
            border: "1px solid rgba(0,0,0,0.05)",
            fontSize: "0.85rem",
            fontWeight: 500,
            px: 1, 
            height: "36px",
            "& .MuiChip-label": { 
              paddingLeft: "8px",
              paddingRight: "8px"
            }
          }}
        />
    ))}
  </Box>
</Box>
      </Paper>

      {/* Auto-Configured Sections */}
      {selectedMarket && (
        <Box className="d-flex flex-column gap-3 mb-4">
          <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9", ...hoverSx }} className="p-3">
            <Typography variant="caption" color="success.main" fontWeight="bold">Selected Market</Typography>
            <Box className="mt-2"><Chip label={`${selectedMarket.flag} ${selectedMarket.name}`} size="small" sx={blueHighlight} /></Box>
          </Paper>

          <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9", ...hoverSx }} className="p-3">
            <Box className="d-flex align-items-center mb-1">
              <LanguageIcon fontSize="small" color="disabled" className="me-2" />
              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>Auto-Selected Language</Typography>
            </Box>
            <Box className="mt-2"><Chip label={selectedMarket.lang} size="small" sx={blueHighlight} /></Box>
          </Paper>

          <Paper variant="outlined" sx={{ bgcolor: "#f0f9f1", borderColor: "#c8e6c9", ...hoverSx }} className="p-3">
            <Box className="d-flex align-items-center mb-1">
              <ChannelIcon fontSize="small" color="disabled" className="me-2" />
              <Typography variant="subtitle2" sx={{ fontSize: "0.85rem", fontWeight: "bold" }}>Auto-Configured Channel</Typography>
            </Box>
            <Box className="mt-2"><Chip label="Email" size="small" sx={blueHighlight} /></Box>
          </Paper>
        </Box>
      )}

      {/* Project Summary Section */}
      <Paper variant="outlined" sx={{ bgcolor: "#f8fbff", borderColor: "#e1f5fe", ...hoverSx }} className="p-4 mb-4">
        <Typography variant="h6" className="mb-3" sx={{ fontSize: "1rem", fontWeight: "bold" }}>Project Summary</Typography>
        <Box className="d-flex flex-column gap-2">
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Selected Markets:</Typography>
            <Typography variant="body2" fontWeight="bold">{selectedMarket ? 1 : 0}</Typography>
          </Box>
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Primary Language:</Typography>
            <Typography variant="body2" fontWeight="bold">{selectedMarket?.lang || "None"}</Typography>
          </Box>
          <Box className="d-flex justify-content-between">
            <Typography variant="body2" color="textSecondary">Channel:</Typography>
            <Typography variant="body2" fontWeight="bold">Email</Typography>
          </Box>
          <Divider className="my-2" />
          <Box className="d-flex justify-content-between align-items-center">
            <Typography variant="body1" fontWeight="bold">Est. Timeline:</Typography>
            <Typography variant="h6" fontWeight="bold" color="primary">{estTimeline}</Typography>
          </Box>
        </Box>
      </Paper>

      <Box className="d-flex justify-content-between align-items-center mt-5">
        <Button variant="text" color="inherit" sx={{ textTransform: "none", color: "#666" }} onClick={() => navigate(-1)}>Back to Assets</Button>
        <Button variant="contained" disableElevation endIcon={<ArrowForwardIcon />} disabled={!selectedMarket} sx={{ textTransform: "none", px: 4, borderRadius: "8px" }} onClick={handleCreateProjectAndContinue}>Create Project &amp; Continue</Button>
      </Box>
    </Container>
  );
};

export default AssetImportContext;